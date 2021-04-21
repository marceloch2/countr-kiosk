/* eslint-disable import/prefer-default-export */
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'

const { remote, shell } = require('electron')

const { Menu, MenuItem } = remote

export function translatedTrayMenu(mainWindow, refreshSettings, openPos) {
  const menu = new Menu()
  menu.append(
    new MenuItem({
      label: 'Open',
      click: () => {
        this.openPos()
      },
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Dashboard',
      click() {
        const dash = 'https://dashboard-new.countrhq.com'
        shell.openExternal(dash)
      },
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Refresh Settings',
      click: () => {
        refreshSettings()
          .then(() => openPos())
          .catch(console.log)
      },
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Web Tools',
      click: () => {
        mainWindow.toggleDevTools()
      },
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Tools',
      click() {
        remote.getCurrentWindow().toggleDevTools()
      },
    })
  )

  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault()
      menu.popup({ window: remote.getCurrentWindow() })
    },
    false
  )

  return menu
}
