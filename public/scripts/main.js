/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'load|signOut|claimed' }] */
/* global socket */
/* eslint-env browser */

function load () {
  var currentUser = signIn(function (username) { // eslint-disable-line no-unused-vars
    // if user is on scoreboard, set them as selected
    // in the future, this should read from userScores or something.
    if (username === 'phil' || username === 'ross' || username === 'karl') {
      document.getElementById(username).className += ' selected'
    } else if (username === 'philip') {
      username = username.substring(0, 4)
      document.getElementById(username).className += ' selected'
    } else {
      document.getElementById('alt').className += ' selected'
    }
    socket.emit('auth', username)
  })

  socket.emit('taskData')

  socket.on('taskList', function (tasks) {
    localStorage.setItem('taskData', JSON.stringify(tasks))
  })

  socket.on('scoreUpdate', function (scores) {
    // update score for each user on scoreboard
    var currentUser = getCookie('username')
    // as a backup, ALWAYS set the alt scoreboard to a score of 0.
    document.getElementById('alt').innerHTML = currentUser.charAt(0).toUpperCase() + currentUser.slice(1) + ': 0 &#x1F31F'

    for (const user in scores) {
      var capitalisedUser = user.charAt(0).toUpperCase() + user.slice(1)
      // if user is current user, also update their userTotalScore
      // and set the alt display to their data
      if (user === currentUser) {
        capitalisedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1)
        localStorage.userTotalScore = scores[user]
        document.getElementById('alt').innerHTML = capitalisedUser + ': ' + scores[user] + ' &#x1F31F'
        // Hailey mode below
        if (currentUser === 'philip') document.getElementById('phil').innerHTML = capitalisedUser + ': ' + scores[user] + ' &#x1F31F'
      }
      // if the element is one of the score board, it needs to be updated
      let element = document.getElementById(user.toLowerCase())
      if (element) {
        element.innerHTML = (capitalisedUser + ': ' + scores[user] + ' &#x1F31F')
      }
    }
  })

  socket.on('highestScore', function (data) {
    let username = data[0]
    let score = data[1]
    if (document.getElementById('highscoreUsername')) {
      document.getElementById('highscoreUsername').innerHTML = username.charAt(0).toUpperCase() + username.slice(1)
      document.getElementById('highscorePoints').innerHTML = score
    }
  })
}

function signIn (callback) {
  // read username cookie
  // call backs make this fully asynch (weee js!)
  var username = getCookie('username')
  if (username == null || username === '') {
    while (username === '' || username == null) {
      username = prompt('Please enter your name ')
      username = username.toLowerCase()
      setCookie('username', username, 1)
      callback(username)
    }
  } else {
    username = getCookie('username')
    callback(username)
  }
}

function signOut () {
  setCookie('username', '')
  location.reload()
}

// CONFIRMATION SECTION
function initConfirm () { // eslint-disable-line no-unused-vars
  var username = getCookie('username')
  socket.emit('reqConfirmTask', username)
  socket.on('getConfirmTask', function (taskData) {
    if (taskData) {
      document.getElementById('queue_user').innerHTML = taskData[0].charAt(0).toUpperCase() + taskData[0].slice(1)
      document.getElementById('queue_task').innerHTML = JSON.parse(localStorage.taskData)[taskData[1]][1].toLowerCase() // should access local storage at key 'taskname', grab task proper name
      localStorage.confirmationData = taskData
    } else {
      document.getElementById('contentHeader').innerHTML = 'Sorry, there are no chores in the confirmation queue right now!'
      document.getElementById('claimBodyHide').style.display = 'none'
    }
  })
}

function confirmYes () { // eslint-disable-line no-unused-vars
  var username = getCookie('username')
  socket.emit('posConfirmTask', [localStorage.confirmationData.split(',')[5], username])
  window.location.href = './confirmed_positive.html'
}

function confirmNo () { // eslint-disable-line no-unused-vars
  var username = getCookie('username')
  socket.emit('negConfirmTask', [localStorage.confirmationData.split(',')[5], username])
  window.location.href = './confirmed_negative.html'
}

function claimed () {
  // user claimed points on last page. Here, update with live view of how many
  // points added, and what user running total is
  var pointsWorth = Number(localStorage.lastClaim.split(';')[1])
  document.getElementById('pointsWorth').innerHTML = pointsWorth
  document.getElementById('userTotalScore').innerHTML = Number(localStorage.userTotalScore)
  if (pointsWorth === 1) document.getElementById('gainedPointsPlural').innerHTML = ''
  pointsWorth = null
}

/*
 * All that cookie business is beyond here
 */

function getCookie (cname) {
  var name = cname + '='
  var ca = document.cookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) === ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ''
}

function setCookie (cname, cvalue, exdays) {
  var d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
  var expires = 'expires=' + d.toUTCString()
  document.cookie = cname + '=' + cvalue + ';' + expires + 'path=/'
}
