/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "claimLoad|newClaim|submitClaim|getCookie" }] */
/* global socket */
/* eslint-env browser */

var taskData = {}

function claimLoad () {
  // load all taskData into the options

  taskData = JSON.parse(localStorage.taskData)
  // clear options
  document.getElementById('selectClaim').innerHTML = ''
  // then load all taskData into the options
  for (const taskID in taskData) {
    var option = '"<option value="' + taskID + '">' + taskData[taskID][1] + '</option>'
    // taskData[taskID][1] is the pretty version of the task
    document.getElementById('selectClaim').innerHTML += option
  }
}

function newClaim () {
  // loads text into HTML elements
  var e = document.getElementById('selectClaim')

  // prepare to print selected text to user again
  var text = e.options[e.selectedIndex].text
  text = text[0].toLowerCase() + text.slice(1)

  var pointsWorth = taskData[e.value][0]

  document.getElementById('chosenAction').innerHTML = text
  document.getElementById('pointsWorth').innerHTML = pointsWorth

  // when user presses "Done" button to claim points,
  // should post selected action, user, and authentication
  // to server. Server then determines point worth, adds to total,
  // adds action to queue.
}

function submitClaim () {
  // submit claim to server

  let username
  var name = 'username='
  var ca = document.cookie.split(';') // cookie
  var taskID = document.getElementById('selectClaim').value

  // get username to submit
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) === ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) === 0) {
      username = c.substring(name.length, c.length)
    }
  }

  socket.emit('claim', ('username:' + username + ';taskID:' + taskID))
  // now that claim is submitted, need to save data for claimed.html

  // saves task ID and worth
  var pointWorth = taskData[taskID][0]
  localStorage.lastClaim = taskID + ';' + pointWorth
  // if user total score DNE, set to 0 then add what user just got
  if (localStorage.userTotalScore == null) localStorage.userTotalScore = 0
  localStorage.userTotalScore = Number(localStorage.userTotalScore) + Number(pointWorth)
  window.location.href = '/claimed'
}

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
