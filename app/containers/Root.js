/* eslint-disable react/destructuring-assignment */
import { remote } from 'electron'
import React, { Component } from 'react'
import { Provider } from 'react-redux'
import i18n from 'i18next'
import { ConnectedRouter } from 'connected-react-router'

import Routes from '../Routes'

const appVersion = require('electron').remote.app.getVersion()

const lang = localStorage.getItem('CountrWeb:Language')

export default class Root extends Component {
  state = { lang }

  componentDidMount() {
    const savedLang = localStorage.getItem('CountrWeb:Language') || 'en'
    this.setState({ lang: savedLang })
    i18n.changeLanguage(savedLang)
  }

  customAction = (act) => {
    switch (act) {
      case 'close':
        remote.app.quit()
        break
      case 'min':
        remote.BrowserWindow.getFocusedWindow().minimize()
        break
      default:
        break
    }
  }

  changeLang = (event) => {
    localStorage.setItem('CountrWeb:Language', event.target.value)
    this.setState({ lang: event.target.value })
    i18n.changeLanguage(event.target.value)
  }

  render() {
    const { store, history } = this.props
    return (
      <div>
        <div id="title-bar">
          <div id="title-bar-btns">
            <i
              onClick={() => this.customAction('close')}
              className="fa fa-times-circle close"
              aria-hidden="true"
            >
              &times;
            </i>
            <i
              onClick={() => this.customAction('min')}
              className="fa fa-minus-circle minimize"
              aria-hidden="true"
            >
              &minus;
            </i>
          </div>
        </div>

        <Provider store={store}>
          <ConnectedRouter history={history}>
            <Routes />
          </ConnectedRouter>
        </Provider>

        <select
          defaultValue={this.state.lang}
          className="app_lang"
          onChange={this.changeLang}
        >
          <option value="en">EN</option>
          <option value="nl">NL</option>
        </select>

        <p className="app_version">Countr Desktop - v{appVersion}</p>
      </div>
    )
  }
}
