/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'load|submitLogin' }] */
/* global socket */
/* eslint-env browser */
function load () {
  if (navigator.credentials) {
    navigator.credentials.get({password: true}).then(c => {
      if (c) {
        console.log('attempting login with saved credentials')
        attemptLogin(c.id, c.passwordName)
      }
    })
  }
}

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

function attemptLogin (username, password) {
  socket.emit('authorizeClient', {
    'username': username,
    'password': password
  })
  socket.on('resolveAuth', function (data) {
    if (data) {
      localStorage.setItem('authToken', data)
      setCookie('username', username, 1)
      if (navigator.credentials) {
        var cred = new PasswordCredential({
          id: username,
          password: password,
          name: name
        })
        navigator.credentials.store(cred).then(function () {
          console.log('Credentials stored')
          setInterval(function () {
            console.log('redirecting')
            window.location.replace('/')
          }, 250)
        }).catch(function () {
          console.error('Unable to store credentials due insecure environment.')
          window.location.replace('/')
        })
      } else {
        setInterval(function () {
          console.log('No navigator.credentials')
          window.location.replace('/')
        }, 250)
      }
    } else {
      loginError()
    }
  })
}

function processForm (e) {
  if (e.preventDefault) e.preventDefault() // prevent default action
  var username = document.getElementById('username').value.toLowerCase()
  var password = document.getElementById('password').value
  animateForm()

  attemptLogin(username, password)
  return false // Prevent refreshing page
}

/* Take over default submit form */
var form = document.getElementById('login-form')

if (form.attachEvent) {
  form.attachEvent('submit', processForm)
} else {
  form.addEventListener('submit', processForm)
}

function setCookie (cname, cvalue, exdays) {
  var d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
  var expires = 'expires=' + d.toUTCString()
  document.cookie = cname + '=' + cvalue + ';' + expires + 'path=/'
}
