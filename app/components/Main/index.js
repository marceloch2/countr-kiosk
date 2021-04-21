import React, { Component } from 'react'

import ip from 'ip'
import os from 'os'

import { Translation } from 'react-i18next'
import { machineIdSync } from 'node-machine-id'

import { AppInstances } from '../../Instances'
import { MerchantContext } from '../../context'

import './main.css'

const appVersion = process.env.npm_package_version

class Main extends Component {
  state = {
    storesList: {},
    storeSelected: {},
    isLoading: false,
  }

  componentDidMount() {
    if (!this.props.context.logged) {
      this.props.history.push('/')
    }

    if (
      this.props.context.remember &&
      localStorage.getItem('device') &&
      localStorage.getItem('localSettings')
    ) {
      return this.props.history.push('/logged')
    }

    AppInstances.getCountrSdk()
      .then((socket) =>
        socket.stores
          .read()
          .then((stores) => this.setState({ storesList: stores }))
          .catch(console.info)
      )
      .catch((e) => {
        throw new Error(e)
      })
  }

  handlerStoreSelect = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
    })
  }

  register = () => {
    if (Object.keys(this.state.storeSelected).length) {
      this.setState({
        isLoading: true,
      })

      AppInstances.getCountrSdk()
        .then(async (socket) => {
          const localSettings = JSON.parse(
            localStorage.getItem('localSettings')
          ) || {
            local_ip: ip.address(),
            printers_saved: [],
            paymentProcessorSettings: [],
          }

          const deviceId = machineIdSync({ original: true })
          const devices = await socket.devices.readOne('search/type', {
            text: 'desktop',
          })

          const currentDevice = devices.filter(
            (device) => device.uuid === deviceId
          )

          if (!currentDevice.length) {
            const device = {
              store: this.state.storeSelected,
              name: 'desktop',
              uuid: deviceId,
              merchant: this.props.context.merchant._id,
              device_type: 'desktop',
              settings: localSettings,
              info: {
                os_name: os.platform(),
                os_type: os.type(),
                os_version: os.release(),
                model: os.arch(),
                desktop_version: appVersion,
              },
            }

            socket.caller.devices
              .create(device)
              .then((deviceCreated) => {
                console.info('#####NEW DEVICE CREATED')
                localStorage.setItem('device', JSON.stringify(deviceCreated))
                localStorage.setItem(
                  'localSettings',
                  JSON.stringify(localSettings)
                )

                this.setState({ isLoading: false })

                return this.props.history.push('/logged')
              })
              .catch((e) => {
                console.info('#####ERROR CREATING NEW DEVICE', e)
                this.setState({ isLoading: false })
              })
          } else {
            console.info('#####DEVICE FOUND')

            localStorage.setItem(
              'localSettings',
              JSON.stringify(currentDevice[0].settings || {})
            )
            localStorage.setItem('device', JSON.stringify(currentDevice[0]))

            // Update device for new version if there is
            // TODO check if the version mismatch
            socket.caller.devices
              .update(currentDevice[0]._id, {
                'info.desktop_version': appVersion,
                'settings.local_ip': ip.address(),
              })
              .then(() =>
                console.log(
                  `#####DEVICE UPDATED - VERSION - ${appVersion} - LOCAL IP - ${ip.address()}`
                )
              )
              .catch((e) =>
                console.log('#####ERROR UPDATING DEVICE VERSION', e)
              )
          }

          this.setState({
            isLoading: false,
          })

          return this.props.history.push('/logged')
        })
        .catch(console.log)
    }
  }

  render() {
    const { storesList, storeSelected, isLoading } = this.state
    return (
      <div>
        {isLoading && (
          <div className="load-bar">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
        )}
        <section className="wrapper">
          <img
            className="logo"
            src="'../../img/color_tag_H.png"
            alt="Countr Logo"
          />
          <Translation>
            {(t) => (
              <div>
                <p>{t('add_store')}</p>
                <select
                  value={storeSelected}
                  onChange={this.handlerStoreSelect('storeSelected')}
                >
                  <option value="">
                    ---{t('store_dropdown_placeholder')}---
                  </option>
                  {storesList.length &&
                    storesList.map((store) => (
                      <option key={store._id} value={store._id}>
                        {store.name}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={this.register}
                  disabled={Object.keys(storeSelected).length === 0}
                >
                  {t('register_terminal')}
                </button>
              </div>
            )}
          </Translation>
        </section>
      </div>
    )
  }
}

export default (props) => (
  <MerchantContext.Consumer>
    {(ctx) => <Main {...props} context={ctx} />}
  </MerchantContext.Consumer>
)
