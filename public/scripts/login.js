/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'load|submitLogin|showRegister' }] */
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

function animateForm (formType) {
  if (formType === 'login') {
    // Hide the login form on authorisation
    document.getElementById('login-form').style.opacity = 0
    document.getElementById('userLeadScore').style.opacity = 0
    document.getElementById('registerEntryBtn').style.opacity = 0
    setTimeout(function () {
      document.getElementById('login-form').style.display = 'none'
      document.getElementById('userLeadScore').innerHTML = 'Logging you in.'
      document.getElementById('userLeadScore').style.opacity = 1
    }, 200)
  } else if (formType === 'register') {
    document.getElementById('register-form').style.opacity = 0
    document.getElementById('userLeadScore').style.opacity = 0
    setTimeout(function () {
      document.getElementById('login-form').style.display = 'none'
      document.getElementById('userLeadScore').innerHTML = 'Registering your account.'
      document.getElementById('userLeadScore').style.opacity = 1
    }, 200)
  }
}

function showError (error) {
  // remove all prior errors
  var errors = document.getElementsByClassName('error')
  while (errors.length) errors[0].className = errors[0].className.replace(/\berror\b/g, '')

  console.error(error)
  if (error.form === 'login') {
    document.getElementById('userLeadScore').innerHTML = error.msg
    document.getElementById('password').className += ('error')
    document.getElementById('username').className += ('error')
    document.getElementById('login-form').style.display = 'flex'
    setTimeout(function () {
      document.getElementById('login-form').style.opacity = 1
      document.getElementById('userLeadScore').style.opacity = 1
      document.getElementById('registerEntryBtn').style.opacity = 1
    }, 400)
  } else if (error.form === 'register') {
    switch (error.type) {
      case 'password':
        document.getElementById('regPassword').className += ('error')
        document.getElementById('confirmPassword').className += ('error')
        break
      case 'username':
        document.getElementById('regUsername').className += ('error')
        break
    }
  }
  document.getElementById('userLeadScore').innerHTML = error.msg
  setTimeout(function () {
    document.getElementById('userLeadScore').style.opacity = 1
    document.getElementById('register-form').style.opacity = 1
  }, 200)
  // type is input field
  // form is login or register
}

function attemptLogin (username, password) {
  // Send login info and await response
  socket.emit('authorizeClient', {
    'username': username,
    'password': password
  })
  socket.on('resolveAuth', function (data) {
    // if server responded with truthy data, authentication was successful
    if (data.accepted) {
      localStorage.setItem('authToken', data.token)
      setCookie('username', username, 1)
      if (navigator.credentials) {
        // If we can, save credentials in Credentials API
        var cred = new PasswordCredential({
          id: username,
          password: password,
          name: name
        })
        navigator.credentials.store(cred).then(function () {
          setInterval(function () {
            window.location.replace('/')
          }, 250)
        }).catch(function () {
          console.error('Unable to store credentials due insecure environment.')
          window.location.replace('/')
        })
      } else {
        // Otherwise just redirect to the homepage
        setInterval(function () {
          console.log('No navigator.credentials')
          window.location.replace('/')
        }, 250)
      }
    } else {
      console.log(data)
      setTimeout(function () {
        showError({
          type: data.error.type,
          form: 'login',
          msg: data.error.msg
        })
      }, 250)
    }
  })
}

function attemptRegister (username, password) {
  socket.emit('registerAccount', {
    username: username,
    password: password
  })
  socket.on('resolveRegister', function (data) {
    if (data.accepted) {
      // Server registered account
      attemptLogin(username, password)
    } else {
      // Server did not accept registration
      showError({
        type: data.error.type,
        form: 'register',
        msg: data.error.msg
      })
    }
  })
}

function processLogin (e) {
  if (e.preventDefault) e.preventDefault() // prevent default action
  var username = document.getElementById('username').value.toLowerCase()
  var password = document.getElementById('password').value
  animateForm('login')

  attemptLogin(username, password)
  return false // Prevent refreshing page
}

function processRegister (e) {
  if (e.preventDefault) e.preventDefault() // prevent default action
  animateForm('register')

  setTimeout(function () {
    var username = document.getElementById('regUsername').value.toLowerCase()
    var password = document.getElementById('regPassword').value
    var confirmPassword = document.getElementById('confirmPassword').value
    if (password !== confirmPassword) {
      console.log(`${password}, ${confirmPassword}, ${password === confirmPassword}`)
      showError({
        type: 'password',
        form: 'register',
        msg: 'Provided passwords do not match.'
      })
    } else {
      attemptRegister(username, password)
    }
    return false
  }, 200)
}

function showRegister () {
  document.getElementById('register').style.display = 'flex'
  var loginElm = document.getElementById('login')
  var regElm = document.getElementById('register')
  var header = document.getElementById('userLeadScore')
  loginElm.style.opacity = 0
  header.style.opacity = 0
  console.time('Animate test')
  setTimeout(function () {
    console.log('Waiting for new element')
    loginElm.style.display = 'none'
    header.innerHTML = 'Register to claim and confirm points. <br /> You receive points for doing chores.'
    header.style.opacity = 1
    regElm.style.opacity = 1
    console.timeEnd()
  }, 200)
}

/* Take over default submit form */
var loginForm = document.getElementById('login-form')
var registerForm = document.getElementById('register-form')

if (loginForm.attachEvent) {
  loginForm.attachEvent('submit', processLogin)
} else {
  loginForm.addEventListener('submit', processLogin)
}

if (registerForm.attachEvent) {
  registerForm.attachEvent('submit', processRegister)
} else {
  registerForm.addEventListener('submit', processRegister)
}

function setCookie (cname, cvalue, exdays) {
  var d = new Date()
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
  var expires = 'expires=' + d.toUTCString()
  document.cookie = cname + '=' + cvalue + ';' + expires + 'path=/'
}
