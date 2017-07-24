/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'load|submitLogin' }] */
/* global socket */
/* eslint-env browser */

function animateForm () {
  // Hide the login form on authorisation
  document.getElementById('login-form').style.opacity = 0
  document.getElementById('userLeadScore').style.opacity = 0
  setTimeout(function () {
    document.getElementById('login-form').style.display = 'none'
    document.getElementById('userLeadScore').innerHTML = 'Logging you in.'
    document.getElementById('userLeadScore').style.opacity = 1
  }, 200)
}

function loginError () {
  // Show the login form if there is an authorisation error
  setTimeout(function () {
    document.getElementById('userLeadScore').innerHTML = 'Username / password not correct, try again.'
    document.getElementById('login-form').style.display = 'block'
    document.getElementById('login-form').style.opacity = 1
    document.getElementById('userLeadScore').style.opacity = 1
  }, 200)
}

function processForm (e) {
  if (e.preventDefault) e.preventDefault() // prevent default action
  var username = document.getElementById('username').value
  var password = document.getElementById('password').value
  animateForm()

  socket.emit('authorizeClient', {
    'username': username,
    'password': password
  })

  socket.on('resolveAuth', function (data) {
    if (data) {
      localStorage.setItem('authToken', data)
      if (navigator.credentials) {
        var cred = new PasswordCredential({
          id: username,
          password: password,
          name: name
        })
        navigator.credentials.store(cred).then(function () {
          window.location.replace('/')
        })
      } else {
        window.location.replace('/')
      }
    } else {
      console.error(data)
      loginError()
    }
  })

  return false // Prevent refreshing page
}

/* Take over default submit form */
var form = document.getElementById('login-form')

if (form.attachEvent) {
  form.attachEvent('submit', processForm)
} else {
  form.addEventListener('submit', processForm)
}
