/* eslint-env browser */

function confirmedInit() { // eslint-disable-line
  var user = localStorage.confirmationData.split(',')[0]
  document.getElementById('user').innerHTML = user.charAt(0).toUpperCase() + user.slice(1)
}
