import React from 'react';

class Header extends React.Component {
  render() {
    return (
      <div className='scoreHeader'>
        <userScore username="phil" userFriendly="Phil" userscore="5" />
  			<span className='userScore' id='phil'>
  				 Phil: 0 &#x1F31F;
  			</span>
  			<span className='userScore' id='karl'>
  				 Karl: 0 &#x1F31F;
  			</span>
  			<span className='userScore' id='ross'>
  				 Ross: 0 &#x1F31F;
  			</span>
  			<span className='userScore alt' id='alt'>
  				Username: 0 &#x1F31F;
  			</span>
  		</div>
    )
  }

}

class userScore extends React.Component {
  constructor() {
    super()
    var username="", userFriendly="", userscore=0;
  }
  render() {
    return (
      <div className='userScore' id={username}>
        {userFriendly}: {userscore} &#x1F31F;
      </div>
    )}
}

export default Header;
