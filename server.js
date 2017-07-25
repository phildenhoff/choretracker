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
var authorizedUsers = {
  'phil': {
    password: 'password',
    token: undefined,
    socketID: undefined
  },
  'karl': {
    password: 'password',
    token: undefined,
    socketID: undefined
  },
  'callmebigpoppa': {
    password: 'hunter2',
    token: undefined,
    socketID: undefined
  }
}
var score = {karl: 0, phil: 0, ross: 0}
var highestScore = ['no one', 0]
var tasks = {}
var confirmationQueue = []
var burntTasks = []

// SETTINGS \\
var args = args
args = process.argv.slice(2) // remove node path and file path from args
var VERBOSE = (args.indexOf('-v') > -1) // check if verbose flag is set
var HELP = (args.indexOf('-h') > -1) || (args.indexOf('help') > -1) // check if help
                                                                                   // flag is set
if (HELP) {
  console.log('Usage: node server.js [-v] \n -v: verbose mode logs excess information \n -h, help: show this message')
  process.exit()
}

// Express Routing \\
// TODO: These really should be in separate files...
app.use(express.static(path.join(__dirname, '/public')))

app.get('/admin', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/admin.html'))
})
app.get('/claim', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/claim.html'))
})
app.get('/claimed', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/claimed.html'))
})
app.get('/confirm', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/confirm.html'))
})
app.get('/confirmed_negative', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/confirmed_negative.html'))
})
app.get('/confirmed_positive', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/confirmed_positive.html'))
})
app.get('/login', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/login.html'))
})

app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

// app.get('/', function (req, res) {
//   // send the index.html file for all requests
//   res.sendFile(path.join(__dirname, '/public/index.html'))
// })

http.listen(3001, function () {
  console.log('listening on *:3001')
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

// TODO:
// send oldest claim to user who goes to 'claim' page. Only remove from queue once answer is supplied
// claims can be confirmed/denied
// wipe scores remaing in queue on a certain day and remove scores from userscore
// give monthly stats of who is highest scoring
//

io.on('connection', function (socket) {
  if (VERBOSE) console.log(socket.id + ' connected')

  socket.on('verifyToken', function (creds) {
    if (authorizeToken(creds)) {
      if (VERBOSE) console.log(`User now authorized with id ${socket.id}`)
      registerEvents(socket)
      io.emit('scoreUpdate', score)
      io.emit('highestScore', highestScore)
      io.emit('taskList', tasks)
    } else {
      io.sockets.connected[socket.id].emit('accessDenied')
      socket.disconnect()
    }
  })
  // Authorise incoming clients username / password combo.
  socket.on('authorizeClient', function (testCredentials) {
    if (authorizedUsers[testCredentials.username] && authorizedUsers[testCredentials.username].password === testCredentials.password) {
      authorizedUsers[testCredentials.username].token = uuid.v1()
      io.sockets.connected[socket.id].emit('resolveAuth', authorizedUsers[testCredentials.username].token)
    } else {
      io.sockets.connected[socket.id].emit('resolveAuth', false)
    }
  })
})

function registerEvents (socket) {
  socket.on('auth', function (username) {
    users[socket.id] = username
    if (VERBOSE) console.log(socket.id + ' is now ' + username)
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
    // If confimation queue is empty, return [true, null] stating there are no available jobs to do
    // For each item in the queue:
    // if it was made by the requester, skip it
    // if it was made by someone other than the requester, submit a object for confirmationQueue and break
    // if the list is completely run through and nothing is found, return [true, null]
    if (confirmationQueue && confirmationQueue.length) {
      for (var i = 0; i < confirmationQueue.length; i++) {
        if (confirmationQueue[i][0] === username) {
          continue // postition in queue is task from user asking to confirm
        } else {
          io.sockets.connected[socket.id].emit('getConfirmTask', confirmationQueue[i])
          return // task is not from user
        }
      }
      io.sockets.connected[socket.id].emit('getConfirmTask', null) // if we got to this point, all items in the queue were from the requester
    } else {
      io.sockets.connected[socket.id].emit('getConfirmTask', null) // confirmationQueue is empty, return empty object
    }
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
    for (var i = 0; i < confirmationQueue.length; i++) {
      if (confirmationQueue[i][5] === queueID) {
        score[confirmationQueue[i][0]] -= Number(confirmationQueue[i][2])
        scoreUpdate()
        burntTasks.push(confirmationQueue.splice(i, 1))
        console.log(`TASK DELETED: ${username} deleted a task with id ${queueID}.`)
        console.log('This task was removed from the queue and added to a list of burnt tasks.')
      } else if (VERBOSE) console.log('No match on ' + confirmationQueue[i] + ' with ' + queueID)
    }
  })

  io.sockets.connected[socket.id].emit('verifyAccess')
}

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

function authorizeToken (creds) {
  var uname = creds.username
  var token = creds.token
  if (authorizedUsers[uname] && authorizedUsers[uname].token === token) {
    return true
  } else {
    return false
  }
}
