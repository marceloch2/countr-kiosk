// updater.js
const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

const updater = {
  enabled: false,
}

autoUpdater.autoDownload = false

autoUpdater.on('error', (event, error) => {
  console.log('Error trying to fetch update: ', error)
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(
    {
      title: 'Install Updates',
      message: 'Updates downloaded, application will be quit for update...',
    },
    () => {
      autoUpdater.quitAndInstall()
    }
  )
})

// Check for updates
function checkForUpdates() {
  autoUpdater.checkForUpdates()
}

module.exports.checkForUpdates = checkForUpdates
