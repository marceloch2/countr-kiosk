import React, { Component } from 'react'
import Logged from '../components/Logged'

export default class LoggedPage extends Component {
  render() {
    return <Logged history={this.props.history} />
  }
}
