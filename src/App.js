import React, { Component } from 'react';
import Header from './components/score_header.js'
import Home from './components/home.js'
import logo from './logo.svg';
import './App.css';

class App extends Component {
  getChildContext() {
    return {highscoreUsername: 'Enrico'};
  }
  render() {
    return (
      <div className="App">
        <Header></Header>
        <Home></Home>
        <p className="App-intro">
          To get started, dick around, <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

App.childContextTypes = {
  highscoreUsername: React.PropTypes.string
};
export default App;
