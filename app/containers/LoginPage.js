import React, { Component } from 'react'
import Login from '../components/Login' // eslint-disable-line

export default class LoginPage extends Component {
  render() {
    return <Login history={this.props.history} />
  }
}
