// REQUIREMENTS \\
var express = require('express')
var app = express()
var http = require('http').Server(app)
const path = require('path')
const uuid = require('node-uuid')

  // SOCKET IO
var io = require('socket.io')(http)

  // CSV reading
var fs = require('fs')
var csv = require('fast-csv') // used to parse CSV

// DATA \\
var users = []
var score = {karl: 0, phil: 0, ross: 0}
var highestScore = ['no one', 0]
var tasks = {}
var confirmationQueue = []
var burntTasks = []

// SETTINGS \\
args = process.argv.slice(2) // remove node path and file path from args
var VERBOSE = (args.indexOf("-v") > -1) ? true : false // check if verbose flag is set
var HELP = (args.indexOf("-h") > -1) || (args.indexOf("help") > -1) ? true : false // check if help
                                                                                   // flag is set
if (HELP) {
    console.log("Usage: node server.js [-v] \n\
    -v: verbose mode logs excess information \n\
    -h, help: show this message")
    process.exit()
}

app.get('/*', function (req, res) {
  // send the index.html file for all requests
  res.sendFile(path.join(__dirname, '/public/index.html'))
  app.use('/public', express.static(path.join(__dirname, '/public')))
})

http.listen(3001, function () {
  if (VERBOSE) console.log('listening on *:3001')
})

// Every five seconds, score data is writen to CSV & score list is updated
setInterval(function () {
  // write score data
  var scoreStream = fs.createWriteStream('scoreData.txt')
  scoreStream.once('open', function (fd) {
    for (var user in score) {
      scoreStream.write(user + ',' + score[user] + '\n')
    }
    scoreStream.end()
    if (VERBOSE) console.log('MNTN: Wrote score to txt')
  })
  // write burnt tasks
  var burntStream = fs.createWriteStream('burntTasks.txt')
  burntStream.once('open', function (fd) {
    for (var task of burntTasks) {
      burntStream.write(task + '\n')
    }
    burntStream.end()
    if (VERBOSE) console.log('MNTN: Wrote burnt tasks to txt')
  })
  scoreUpdate()
}, 10000)

loadTasks()
loadScoreData()
scoreUpdate()

// to do:
// send oldest claim to user who goes to 'claim' page. Only remove from queue once answer is supplied
// claims can be confirmed/denied
// wipe scores remaing in queue on a certain day and remove scores from userscore
// give monthly stats of who is highest scoring
//
// change layout from many HTML pages to one react pages

io.on('connection', function (socket) {
  if (VERBOSE) console.log(socket.id + ' connected')

    // why the fuck is this here if it does nothing?
  socket.on('connect', function () {
  })

  socket.on('auth', function (username) {
    users[socket.id] = username
    if (VERBOSE) console.log(socket.id + ' is now ' + username)
    io.emit('scoreUpdate', score)
    io.emit('highestScore', highestScore)
    io.emit('taskList', tasks)
  })

  socket.on('claim', function (data) {
    // data will come array in form:
    // [username:<username>, task:<taskName>]
    var submitDate = new Date()
    // expires exactly 30 days (in ms) later
    var expiryDate = new Date(submitDate.getTime() + 2592000000)
    data = data.split(';')
    data[0] = data[0].split(':')
    var taskID = data[1].split(':')[1] // <-- this is task
    var taskWorth = tasks[taskID][0] // <-- this is the task worth
    var queueID = uuid.v1() // unique identifier
    scoreUpdate(data[0][1], taskWorth)
    // should push username, taskname, point worth at time of adding, time + date submitted to queue, expiry date, and unique queue ID
    confirmationQueue.push([data[0][1], taskID, taskWorth, submitDate.getTime(), expiryDate.getTime(), queueID])
    console.log('TASK: ', `${data[0][1]}, ${taskID}, ${taskWorth} point,  on ${submitDate.toUTCString()}, expires ${expiryDate.toUTCString()}`)
  })

  socket.on('taskData', function () {
    io.sockets.connected[socket.id].emit('taskList', tasks)
  })

  // confirmation queue things
  socket.on('reqConfirmTask', function (username) {
    if (confirmationQueue[0] != null) {
      // test if the user who submitted the task is the user trying to confirm it
      var i = 0
      var nextAvailItem = confirmationQueue[i]
      while (i <= confirmationQueue.length && nextAvailItem[0] === username) {
        nextAvailItem = confirmationQueue[i]
        i++
      }
      if (i > confirmationQueue.length || confirmationQueue[0] === null || nextAvailItem[0] === username) {
        io.sockets.connected[socket.id].emit('getConfirmTask', [true, null])
      } else {
        io.sockets.connected[socket.id].emit('getConfirmTask', [confirmationQueue[0] == null, confirmationQueue[0]])
      }
    } else io.sockets.connected[socket.id].emit('getConfirmTask', [true, null])
  })

  socket.on('posConfirmTask', function (data) {
    var queueID = data[0]
    var username = data[1]
    if (confirmationQueue[0][5] === queueID) confirmationQueue.shift()
    console.log(`A task was confirmed by ${username}`)
  })

  socket.on('negConfirmTask', function (data) {
    var queueID = data[0]
    var username = data[1]
    if (confirmationQueue[0][5] === queueID) {
      score[confirmationQueue[0][0]] -= Number(confirmationQueue[0][2])
      scoreUpdate()
      burntTasks.push(confirmationQueue.shift())
      console.log(`TASK DELETED: ${username} deleted a task with id ${queueID}.`)
      console.log('This task was removed from the queue and added to a list of burnt tasks.')
    } else console.log('Task to be burned was not the next task. No tasks have been removed.')
  })
})

// functions that will get called because of users. Either
//  a) to send data or
//  b) to process received data

function scoreUpdate (username, addedpoints) {
  if (username) {
    console.log('server updated score: ' + username + ' got ' + addedpoints + ' points.')
    score[username] = score[username] ? score[username] + Number(addedpoints) : Number(addedpoints)
  }
  io.emit('scoreUpdate', score)
  var tempHighscore = 0
  var tempUser = ''
  for (var user in score) {
    if (score[user] > tempHighscore) {
      tempHighscore = score[user]
      tempUser = user
    }
  }
  highestScore[1] = tempHighscore
  highestScore[0] = tempUser
  io.emit('highestScore', highestScore)
}

function loadTasks () {
  fs.createReadStream('tasks.csv')
    .pipe(csv())
    .on('data', function (data) {
      if (data[0] !== 'taskName') { // ignoring the first line (with titles)
        // take third item (id) and use as key. Then, set data to be point worth and friendly name
        tasks[data[2]] = [data[1], data[0]]
      }
    })
    .on('end', function (data) {
      console.log('START: Read tasks.')
    })
}

function loadScoreData () {
  if (fs.existsSync('scoreData.txt')) {
    fs.createReadStream('scoreData.txt')
      .pipe(csv())
      .on('data', function (data) {
        if (data[0] !== 'username') {
          score[data[0]] = Number(data[1])
        }
      })
      .on('end', function (data) {
        console.log('START: Read score.')
      })
  } else {
    console.log('START: No score data to read.')
  }
}
