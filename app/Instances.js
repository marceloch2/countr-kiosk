/* eslint-disable */
import CountrClient from '@countr/sdk'

require('dotenv').config()

const WebSocketServer = require('ws')
const Http = require('http')
const { shell } = require('electron')

// Receipts
import printBill from './libs/printer/bill'
import printOrder from './libs/printer/printOrder'
import printReceipt from './libs/printer/receipt'
import printTest from './libs/printer/printTest'
import screen from './libs/screen'

// Report
import PrintReport from './libs/printer/printReport'

// cashDrawer
import cashDrawer from './libs/printer/cashDrawer'

// Custom payment
import CustomPayment from './libs/custom-payment'

let server = new Http.createServer()

server.listen(2222)

const deviceName = 'countr-desktop'
/**
 * Creating a instance for Countr SDK
 */
export const AppInstances = (function () {
  let instance, webWorker, socketServer, customPayment

  // Create Websocket
  const createWebSocket = async () => new WebSocketServer.Server({ server })

  function getCustomPayment() {
    return customPayment
  }

  function setCustomPayment(custom) {
    customPayment = custom
  }

  // Countr SDK
  async function createCountrSdk() {
    const countrClient = new CountrClient({
      opts: {
        staging: !process.env.PRODUCTION && process.env.STAGING,
        local: !process.env.PRODUCTION && !process.env.STAGING,
        enableSocket: true,
      },
    })

    if (!process.env.PRODUCTION) {
      countrClient.setClient({
        client_id: 'client-f5189179da1eeff475cf9fcd233e155824fd497a',
        client_secret: 'secret-5248dc339a5812d07e1fcee9a7845fc6fd713a5c',
      })
    } else {
      countrClient.setClient({
        client_id: 'client-ea1412c04fed650285a1b2640f095e1fc794d66a',
        client_secret: 'secret-577308f714567efbe2977b603085ab1fe01da6a2',
      })
    }

    // Listening for Refresh event dispatched after
    // Token get refreshed by the Monolith/Server
    countrClient.on('refreshed', async (token) => {
      try {
        await localStorage.setItem('access_token', token.access_token)
        await localStorage.setItem('refresh_token', token.refresh_token)
      } catch (error) {
        // @TODO trigger monolith error endpoint and do a graceful degradation
        console.error(error)
      }
    })

    return countrClient
  }

  const createErrorLog = (error, message) => {
    let user = localStorage.getItem('user')
    let device = localStorage.getItem('device')

    if (user && device) {
      user = JSON.parse(user)
      device = JSON.parse(device)

      AppInstances.logError({
        message,
        user: user._id,
        store: device.store,
        device: device._id,
        stack: JSON.stringify(error),
        date: new Date().toISOString(),
      })
    }
  }

  return {
    /**
     * Singleton to ensure same instance of Countr SDK Object
     */
    getCountrSdk() {
      if (!instance) {
        instance = createCountrSdk()
      }

      return instance
    },

    /**
     * Log error with Countr
     */
    logError: async (errorObj) => {
      let countr = await AppInstances.getCountrSdk()

      errorObj.date = new Date().toISOString()
      errorObj.source = process.env.APP_ERROR_SOURCE

      try {
        countr.e.create(errorObj).catch((error) => {
          console.log(error)
        })
      } catch (error) {
        console.error(error)
      }
    },

    /**
     * Get local socket server or create new one if undefined to trigger commands for local network
     */
    async getSocketServer() {
      if (!socketServer) {
        socketServer = await createWebSocket()

        socketServer.on('connection', (ws) => {
          ws.on('error', (error) => {
            createErrorLog(error, 'Desktop socket onerror')
          })

          ws.once('close', (evt) => {
            ws.removeAllListeners()
            ws.terminate()
            createErrorLog(evt, 'Desktop socket onclose')
          })

          ws.on('message', async (message) => {
            const msg = JSON.parse(message)

            if (!msg) return

            if (msg.type !== undefined) {
              switch (msg.type) {
                case 'print':
                  console.log('print')
                  const printersReceipts = msg.ip.printers_saved
                  for (const printer in printersReceipts) {
                    if (printersReceipts.hasOwnProperty(printer)) {
                      if (printersReceipts[printer].roles.includes('receipt')) {
                        printReceipt(
                          ws,
                          printersReceipts[printer],
                          msg.payload,
                          createErrorLog
                        )
                      }
                    }
                  }
                  break
                case 'print-order':
                  console.log('print-order')
                  const printersOrder = msg.ip.printers_saved

                  for (const printer in printersOrder) {
                    if (printersOrder.hasOwnProperty(printer)) {
                      if (printersOrder[printer].roles.includes('order')) {
                        printOrder(
                          ws,
                          printersOrder[printer],
                          msg.payload,
                          createErrorLog
                        )
                      }
                    }
                  }
                  break
                case 'print-bill':
                  console.log('print-bill')
                  const printersBills = msg.ip.printers_saved
                  for (const printer in printersBills) {
                    if (printersBills.hasOwnProperty(printer)) {
                      if (printersBills[printer].roles.includes('receipt')) {
                        printBill(
                          ws,
                          printersBills[printer],
                          msg.payload,
                          createErrorLog
                        )
                      }
                    }
                  }
                  break
                case 'print-report':
                  console.log('print-report')
                  const printersReport = msg.ip.printers_saved
                  for (const printer in printersReport) {
                    if (printersReport.hasOwnProperty(printer)) {
                      if (printersReport[printer].roles.includes('report')) {
                        PrintReport().printReport(
                          ws,
                          printersReport[printer],
                          msg.payload,
                          createErrorLog
                        )
                      }
                    }
                  }
                  break
                case 'print-test':
                  console.log('print-test')
                  const printersTest = msg.ip.printers_saved
                  for (const printer in printersTest) {
                    if (printersTest.hasOwnProperty(printer)) {
                      printTest(ws, printersTest[printer], createErrorLog)
                    }
                  }
                  break
                case 'screen':
                  screen(msg.payload)
                  break
                case 'cashdrawer':
                  cashDrawer(msg)
                  break
                case 'custom-payment':
                  const countr = await AppInstances.getCountrSdk()
                  const custom = new CustomPayment(
                    countr,
                    ws,
                    msg.payload,
                    createErrorLog
                  )
                  setCustomPayment(custom)
                  custom.initPayment()
                  break
                case 'custom-payment-start':
                  const customStart = getCustomPayment()
                  customStart.startPayment()
                  break
                case 'custom-payment-cancel':
                  const customCancel = getCustomPayment()
                  customCancel.handleCancel()
                  break
                case 'open-dashboard':
                  shell.openExternal(msg.payload.url)
                  break
                default:
                  break
              }
            }
          })
        })
      }

      return socketServer
    },
  }
})()
