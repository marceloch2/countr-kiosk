import React, { Component } from 'react'
import ip from 'ip'
import { Translation } from 'react-i18next'
import { machineIdSync } from 'node-machine-id'

import styles from './logged.css'
import { AppInstances } from '../../Instances'
import { MerchantContext } from '../../context'

import { translatedTrayMenu } from './TrayMenu'

const isDev = require('electron-is-dev')
const electron = require('electron')

const { app, BrowserWindow, Tray } = electron.remote

const appVersion = app.getVersion()

// Current Countr Web Window
let countrWeb
let countrTray

class Logged extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showSettings: false,
    }
  }

  componentDidMount() {
    this.init()
  }

  handlerStoreSelect = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
    })
  }

  /**
   *
   */
  refreshSettings = () =>
    AppInstances.getCountrSdk()
      .then(async (socket) => {
        let storedDevice = JSON.parse(localStorage.getItem('device'))
        storedDevice = await socket.devices.readOne(storedDevice._id)

        return localStorage.setItem(
          'localSettings',
          JSON.stringify(storedDevice.settings)
        )
      })
      .catch(console.log)

  /**
   *
   */
  logout = () => {
    // eslint-disable-next-line react/prop-types
    const { history } = this.props

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_type')
    localStorage.removeItem('user')
    localStorage.removeItem('localSettings')
    localStorage.removeItem('device')

    if (countrWeb) {
      countrWeb.close()
    }
    if (countrTray) {
      countrTray.destroy()
    }

    electron.remote.getCurrentWindow().webContents.isRunning = false
    electron.remote.getCurrentWindow().show()

    history.push('/')
  }

  async init() {
    await AppInstances.getSocketServer()

    this.setListeners()

    if (!isDev) {
      // Hide main screen
      // remote.getCurrentWindow().hide()
    }

    let settings = JSON.parse(localStorage.getItem('localSettings') || {})

    const currentToken = localStorage.getItem('access_token')
    const currentRefreshToken = localStorage.getItem('refresh_token')
    const socket = await AppInstances.getCountrSdk()
    const deviceId = machineIdSync({ original: true })

    const devices = await socket.devices.readOne('search/type', {
      text: 'desktop',
    })

    const currentDevice = devices.filter((device) => device.uuid === deviceId)

    if (currentDevice && currentDevice.length && currentDevice[0].settings) {
      socket.caller.devices
        .update(currentDevice[0]._id, {
          'info.desktop_version': appVersion,
          'settings.local_ip': ip.address(),
        })
        .then(() =>
          console.log(`#####DEVICE UPDATED - LOCAL IP - ${ip.address()}`)
        )
        .catch((e) => console.log('#####ERROR UPDATING DEVICE VERSION', e))

      currentDevice[0].settings.local_ip = ip.address()

      settings = JSON.stringify(currentDevice[0].settings) // eslint-disable-line prefer-destructuring
    }

    const { width, height } = electron.remote.screen.getPrimaryDisplay().size

    countrWeb = new BrowserWindow({
      width,
      height,
      show: true,
      animate: false,
      resizable: true,
      webPreferences: {
        devTools: true,
        webSecurity: false,
        nodeIntegration: false,
        allowRunningInsecureContent: true,
        enableRemoteModule: true,
      },
      center: true,
      setAutoHideMenuBar: true,
      simpleFullscreen: true,
    })

    countrWeb.loadURL(process.env.COUNTR_WEB_URL)

    countrWeb.webContents.on('crashed', console.log)

    if (isDev) {
      countrWeb.openDevTools()
    }

    countrWeb.webContents.on('did-finish-load', () => {
      countrWeb.webContents.executeJavaScript(
        `localStorage.setItem("access_token", ${JSON.stringify(currentToken)})`
      )

      countrWeb.webContents.executeJavaScript(
        `localStorage.setItem("refresh_token", ${JSON.stringify(
          currentRefreshToken
        )})`
      )

      countrWeb.webContents.executeJavaScript(
        'localStorage.setItem("CountrLite:RememberLogin", "true")'
      )

      countrWeb.webContents.executeJavaScript(
        'localStorage.setItem("isDesktop", "true")'
      )
      countrWeb.webContents.executeJavaScript(
        `localStorage.setItem("DesktopVersion", ${JSON.stringify(appVersion)})`
      )

      const currentLang = localStorage.getItem('CountrWeb:Language')

      if (currentLang) {
        countrWeb.webContents.executeJavaScript(
          `localStorage.setItem("CountrWeb:Language", ${JSON.stringify(
            currentLang
          )})`
        )
      }

      const saveLocalSettings = `localStorage.setItem("CountrLite:LocalDesktop", ${JSON.stringify(
        settings
      )});` // eslint-disable-line prefer-template
      countrWeb.webContents.executeJavaScript(saveLocalSettings)
    })

    if (!isDev) {
      let trayIcon = `./app/img/trayLogo.png`
      trayIcon = `${app.getAppPath()}/app/img/trayLogo.png`

      countrTray = new Tray(trayIcon)

      countrTray.setContextMenu(
        translatedTrayMenu(countrWeb, this.refreshSettings, this.openPos)
      )
    }

    countrWeb.setMenu(null)

    countrWeb.on('close', () => {
      electron.remote.getCurrentWindow().show()

      if (!isDev) {
        countrTray.destroy()
      }

      countrWeb = null
    })
  }

  toggleSettings = () => {
    this.setState((state) => ({
      showSettings: state.showSettings,
    }))
  }

  setListeners = () => {}

  render() {
    const { showSettings } = this.state
    return (
      <section className="wrapper">
        <img
          className="logo"
          src="'../../img/color_tag_H.png"
          alt="Countr POS"
        />

        <div className={styles.tools}>
          <div className={styles.username}>
            {this.props.context.merchant.username}
          </div>
          <Translation>
            {(t) => (
              <div>
                <button type="button" onClick={this.openPos}>
                  {t('reopen_pos')}
                </button>
                <button type="button" onClick={this.logout}>
                  {t('signing_out')}
                </button>
              </div>
            )}
          </Translation>
        </div>
      </section>
    )
  }
}

export default (props) => (
  <MerchantContext.Consumer>
    {(ctx) => <Logged {...props} context={ctx} />}
  </MerchantContext.Consumer>
)
