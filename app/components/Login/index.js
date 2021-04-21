import React, { Component } from 'react'

import { Translation } from 'react-i18next'

import { machineIdSync } from 'node-machine-id'

import styles from './login.css'

import { AppInstances } from '../../Instances'

import Utils from '../../utils/Utils'

import { MerchantContext, state } from '../../context'

export default class Login extends Component {
  state = {
    username: '',
    password: '',
    isLoading: true,
    error: false,
    isInternetConnected: false,
    remember: Boolean(localStorage.getItem('desktopRemember') || false),
  }

  componentDidMount() {
    this.submitLogin.addEventListener('keyup', (event) => {
      event.preventDefault()
      if (event.keyCode === 13) {
        this.login()
      }
    })

    const intervalId = setInterval(() => {
      if (Utils.isInternetConnected()) {
        clearInterval(intervalId)
        this.setState({ isInternetConnected: true }, () => {
          this.init()
        })
      }
    }, 500)

    // Just making sure to set remeber password in the first login
    // Usually, clients forget to set it
    const rememberPass = JSON.parse(localStorage.getItem('desktopRemember'))
    if (!rememberPass) {
      this.setState({ remember: true })
      localStorage.setItem('desktopRemember', true)
    }
  }

  init = () => {
    if (
      localStorage.getItem('desktopRemember') &&
      localStorage.getItem('access_token') &&
      localStorage.getItem('refresh_token')
    ) {
      AppInstances.getCountrSdk()
        .then(async (socket) => {
          socket.setToken({
            access_token: localStorage.getItem('access_token'),
            refresh_token: localStorage.getItem('refresh_token'),
          })

          const deviceId = machineIdSync({
            original: true,
          })

          const devices = await socket.devices
            .readOne('search/type', {
              text: 'desktop',
            })
            .catch(() =>
              this.setState({
                isLoading: false,
              })
            )

          if (!devices) {
            this.setState({
              isLoading: false,
            })

            return
          }

          const currentDevice = devices.filter(
            (device) => device.uuid === deviceId
          )

          if (currentDevice.length) {
            localStorage.setItem(
              'localSettings',
              JSON.stringify(currentDevice[0].settings || {})
            )
            localStorage.setItem('device', JSON.stringify(currentDevice[0]))

            this.rememberMe(true)
          } else {
            localStorage.removeItem('localSettings')
            localStorage.removeItem('device')

            this.rememberMe(false)
          }

          AppInstances.getCountrSdk()
            .then((countr) => {
              countr.me
                .read()
                .then((user) => {
                  localStorage.setItem('user', JSON.stringify(user))
                  state.updateMerchant(user)
                  this.setState({
                    isLoading: false,
                  })

                  return this.props.history.push('/main')
                })
                .catch(() =>
                  this.setState({
                    isLoading: false,
                  })
                ) // @TODO send error event and mongodb and trigger a message

              return countr.setToken({
                access_token: localStorage.getItem('access_token'),
                refresh_token: localStorage.getItem('refresh_token'),
              })
            })
            .catch(() =>
              this.setState({
                isLoading: false,
              })
            ) // @TODO send error event and mongodb and trigger a message

          return devices
        })
        .catch(() => {
          this.setState({
            isLoading: false,
          })
        }) // @TODO send error event and mongodb and trigger a message
    } else {
      localStorage.clear()
      this.setState({
        isLoading: false,
      })
    }
  }

  setUsername = (e) => {
    this.setState({ username: e.target.value })
  }

  rememberMe = (val) => {
    state.updateRememberPassword(true)

    this.setState({ remember: val })
    localStorage.setItem('desktopRemember', val)
  }

  setPassword = (e) => {
    this.setState({ password: e.target.value })
  }

  isReady = (username, password) =>
    new Promise(async (resolve, reject) => {
      const countr = await AppInstances.getCountrSdk()

      countr.once('registered', (token) => {
        localStorage.setItem('token_type', token.token_type)
        localStorage.setItem('access_token', token.access_token)
        localStorage.setItem('refresh_token', token.refresh_token)
        countr.setToken({
          access_token: token.access_token,
          refresh_token: token.refresh_token,
        })
      })

      countr
        .register(username, password)
        .then(
          (user) => {
            localStorage.setItem('user', JSON.stringify(user))

            if (!localStorage.getItem('access_token')) {
              countr.refresh()
            }

            return resolve(user)
          },
          (error) => reject(error)
        )
        .catch(console.log)
    })

  /**
   * Login
   */
  login = () => {
    const _self = this

    const { username, password } = this.state

    this.setState({ isLoading: true })

    this.isReady(username, password)
      .then(
        (user) => {
          localStorage.setItem('user', JSON.stringify(user))

          // Updating MerchantContext with the logged Merchant
          state.updateMerchant(user)

          this.setState({ isLoading: false })

          return this.props.history.push('/main')
        },
        (e) => {
          if (e.status === 400) {
            this.setState({
              isLoading: false,
              error: true,
            })

            setTimeout(() => {
              _self.setState({ error: false })
            }, 2000)
          }
        }
      )
      .catch(console.log)
  }

  render() {
    return (
      <div
        ref={(r) => {
          this.submitLogin = r
        }}
      >
        {/* LOADER */}
        {this.state.isLoading && (
          <div className="load-bar">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
        )}

        <MerchantContext.Consumer>
          {() => (
            <Translation>
              {(t) => (
                <section className="wrapper">
                  <img
                    className="logo"
                    src="'../../img/color_tag_H.png"
                    alt="Countr Logo"
                  />
                  <div
                    id="login"
                    className={
                      this.state.error
                        ? 'shakeElm'.concat(' ').concat(`${styles.loginError}`)
                        : ''
                    }
                  >
                    <input
                      autoFocus
                      type="email"
                      placeholder={t('username')}
                      value={
                        this.state.username // eslint-disable-line jsx-a11y/no-autofocus
                      }
                      disabled={this.state.isLoading}
                      onChange={this.setUsername}
                      list="defaultEmails"
                    />

                    <datalist id="defaultEmails" />

                    <input
                      type="password"
                      placeholder={t('password')}
                      disabled={this.state.isLoading}
                      value={this.state.password}
                      onChange={this.setPassword}
                    />

                    <label
                      htmlFor="remember-password"
                      id="remember-password-wrapper"
                    >
                      {t('remember_password')}
                      <input
                        name="remember-password"
                        id="remember-password"
                        type="checkbox"
                        checked={this.state.remember}
                        onChange={() => this.rememberMe(!this.state.remember)}
                      />
                    </label>

                    <button
                      onClick={this.login}
                      disabled={
                        !this.state.username.length ||
                        !this.state.password.length
                      }
                    >
                      {t('login')}
                    </button>
                    {!this.state.isInternetConnected && (
                      <div className={styles.wait}>
                        Waiting for internet connection...
                      </div>
                    )}
                  </div>
                </section>
              )}
            </Translation>
          )}
        </MerchantContext.Consumer>
      </div>
    )
  }
}
