/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 */
import { app, BrowserWindow } from 'electron'
import MenuBuilder from './menu'
import { checkForUpdates } from './updater'

const isDev = require('electron-is-dev')
const os = require('os')

let mainWindow = null

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')()
  const path = require('path')
  const p = path.join(__dirname, '..', 'app', 'node_modules')
  require('module').globalPaths.push(p)
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(console.log)
}

function createMainWindow() {
  app.allowRendererProcessReuse = false
  mainWindow = new BrowserWindow({
    show: true,
    width: 550,
    height: 525,
    resizable: false,
    frame: false,
    webPreferences: {
      contextIsolation: false,
      devTools: true,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  })

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // Someone tried to run a second instance, we should focus our window.
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })

    // Create myWindow, load the rest of the app, etc...
    app.on('ready', () => {})
  }

  mainWindow.loadURL(`file://${__dirname}/app.html`)

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }

    mainWindow.webContents.isRunning = true

    mainWindow.show()
    mainWindow.focus()
  })

  // mainWindow.webContents.devToolsWebContents.enableEditHotkeys()

  mainWindow.on('close', () => {
    if (mainWindow && mainWindow.webContents) {
      delete mainWindow.webContents.isRunning
      mainWindow = null
    }
  })

  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()
}

app.once('window-all-closed', app.quit)
app.once('before-quit', () => {
  if (mainWindow && mainWindow.webContents) {
    delete mainWindow.webContents.isRunning
    mainWindow.removeAllListeners('close')
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  }
})

// eslint-disable-next-line func-names
!(async function () {
  await app.whenReady()
  if (process.env.STAGING === 'true' || !isDev) {
    const isWin = process.platform === 'win32'

    if (!isWin || parseFloat(os.release()) > 6.1) {
      checkForUpdates()
    }
  }

  /**
   * Create the main app window
   */
  createMainWindow()

  /**
   * Install extension for development
   */
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions()
  }
})()
