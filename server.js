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

// SETTINGS \\
var VERBOSE = false

app.get('/', function (req, res) {
  // send the index.html file for all requests
  res.sendFile(path.join(__dirname, '/public/index.html'))
  app.use('/public', express.static(path.join(__dirname, '/public')))
})

http.listen(3001, function () {
  console.log('listening on *:3001')
})

// Every five seconds, score data is writen to CSV & score list is updated
setInterval(function () {
  var stream = fs.createWriteStream('scoreData.txt')
  stream.once('open', function (fd) {
    for (var user in score) {
      stream.write(user + ',' + score[user] + '\n')
    }
    stream.end()
    if (VERBOSE) console.log('MNTN: Wrote score to txt')
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
// give monthly stats of who is highest
// highschol
//
// change layout from many HTML pages to one react pages

io.on('connection', function (socket) {
  if (VERBOSE) console.log(socket.id + ' connected')

  socket.on('connect', function () {
  })

  socket.on('auth', function (username) {
    // may want some authentication in the future...
    users[socket.id] = username
    if (VERBOSE) console.log(socket.id + ' is now ' + username)
    // also do sign-in duties now, instead of waiting for next broadcast
    // console.log('New user scoreUpdate, highestScore, taskList')
    io.emit('scoreUpdate', score)
    io.emit('highestScore', highestScore)
    io.emit('taskList', tasks)
  })

  // user claims to do task
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

    // should push username, taskname, point worth at time of adding, time + date submitted to queue, expiry date
    confirmationQueue.push([data[0][1], taskID, taskWorth, submitDate.getTime(), expiryDate.getTime(), queueID])

    console.log('TASK: ', `${data[0][1]}, ${taskID}, ${taskWorth} point,  on ${submitDate.toUTCString()}, expires ${expiryDate.toUTCString()}`)
  })

  // user reqests list of tasks
  socket.on('taskData', function () {
    io.sockets.connected[socket.id].emit('taskList', tasks)
  })

  // confirmation queue things
  socket.on('reqConfirmTask', function () {
    io.sockets.connected[socket.id].emit('getConfirmTask', [confirmationQueue[0] === null, confirmationQueue[0]])
  })

  socket.on('posConfirmTask', function (queueID) {
    if (confirmationQueue[0][5] === queueID) console.log(confirmationQueue.pop())
    console.log(confirmationQueue)
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
  for (var user in score) {
    if (score[user] > Number(highestScore[1])) {
      highestScore[1] = score[user]
      highestScore[0] = user
    }
  }
  io.emit('highestScore', highestScore)
}

// load tasks from CSV into array
function loadTasks () {
  fs.createReadStream('tasks.csv') // file name
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

// load user score data from CSV into array
function loadScoreData () {
  fs.createReadStream('scoreData.txt') // file name
    .pipe(csv())
    .on('data', function (data) {
      if (data[0] !== 'username') { // ignoring the first line (with titles)
        // take third item (id) and use as key. Then, set data to be point worth and friendly name
        score[data[0]] = Number(data[1])
      }
    })
    .on('end', function (data) {
      console.log('START: Read score.')
    })
}
