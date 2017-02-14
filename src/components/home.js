import React from 'react';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      highscoreUsername: "Phil"
    }
  }
  render() {
    return (
      <div className='content'>
        <span id='userLeadScore'>
    			Currently {this.context.highscoreUsername} is in the lead, with <span id='highscorePoints'></span> points!
    		</span>
    		<a href='/public/claim.html'>
    		<span className='btn claimBtn'>
    			Claim &#x1F31F;
    		</span>
    		</a>
    		<a href='/public/confirm.html'>
    		<span className='btn confirmBtn'>
    			Confirm &#x1F31F;
    		</span>
    		</a>
      </div>
    )
  }
};


Home.contextTypes = {
  highscoreUsername: React.PropTypes.string
};
export default Home
