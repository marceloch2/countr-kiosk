/* eslint-disable global-require */
const net = require('net')
const { DOMParser } = require('xmldom')

const {
  rePrintXml,
  cardPaymentxml,
  xmlToByteArray,
  arrayBufferToString,
  // reprintLastTicket,
  DeviceResponseXml,
} = require('./util.js')

let localStorage
let currentTransaction

if (window.localStorage) {
  localStorage = window.localStorage // eslint-disable-line prefer-destructuring
} else {
  const { LocalStorage } = require('node-localstorage') // eslint-disable-line prefer-destructuring
  localStorage = new LocalStorage('./countr')
}

const currentLanguage = 'EN'
let currentPayment = {}
let isReprinting = false
let justReprint = false

const T1 = 15000
const T2 = 50000
const lport = 4102
const mPort = 4100

let socketDisplay
let tcpIp

const localDesktop = JSON.parse(localStorage.getItem('localSettings'))

if (
  localDesktop &&
  localDesktop.paymentProcessorSettings &&
  localDesktop.paymentProcessorSettings.length &&
  localDesktop.paymentProcessorSettings[0].ccv
) {
  // Create server to listening ccv
  net.createServer(onClientConnected).listen(lport)
}

const reprintServiceRequest = (exports.reprintServiceRequest = (ws, args) => {
  socketDisplay = ws
  let localSettings = localStorage.getItem('localSettings')

  if (!localSettings) return
  localSettings = JSON.parse(localSettings)
  tcpIp = localSettings.paymentProcessorSettings[0].ccv.ipAddress

  justReprint = true

  openTunnelConnection()
    .then((socket) => {
      socket.on('connect', (e) => {
        let reprintData = socket.write(
          xmlToByteArray(
            rePrintXml(
              Number(localStorage.getItem('requestID')) + 1,
              args.deviceName,
              args.languageCode,
              'TicketReprint',
              'Available',
              'Available'
            )
          )
        )

        if (reprintData) {
          socketDisplay.send(
            JSON.stringify({
              name: 'Success',
              payload: {},
            })
          )
        }
      })
    })
    .catch(console.error)
})

const cardServiceRequest = (exports.cardServiceRequest = (ws, args) => {
  tcpIp = args.ccvLocalIp
  socketDisplay = ws
  currentPayment = args
  justReprint = false

  openTunnelConnection()
    .then((tunnel) => {
      const id = Number(localStorage.getItem('requestID')) + 1

      localStorage.setItem('requestID', id)

      currentTransaction = args

      const data = cardPaymentxml(
        id,
        args.workstationID,
        args.currentLanguage,
        args.currency,
        args.amount,
        args.requestType,
        'Available',
        'Available'
      )

      const dataToByte = xmlToByteArray(data)
      return tunnel.write(dataToByte)
    })
    .catch(console.error)
})

/**
 * Tunnel factory
 * @return {Socket} Socket instance
 */
const openTunnelConnection = async () => {
  const mainTunnel = await net.createConnection({ port: mPort, host: tcpIp })

  mainTunnel.setTimeout(T1)

  // Removing the timeout once the socket connect
  mainTunnel.once('connect', () => mainTunnel.setTimeout(0))

  mainTunnel.on('error', () => console.error)

  mainTunnel.on('data', async (data) => {
    mainTunnel.destroy()
    mainTunnel.unref()

    // Dispatch the event.
    window.dispatchEvent(
      new CustomEvent('ccv-messages', { detail: arrayBufferToString(data) })
    )

    const xml = new DOMParser().parseFromString(arrayBufferToString(data))

    const overallResult = xml.documentElement.getAttribute('OverallResult')
    const workstationID = xml.documentElement.getAttribute('WorkstationID')

    const requestType = xml.documentElement.getAttribute('RequestType')
    // const requestId = xml.documentElement.getAttribute('RequestID')

    switch (overallResult) {
      case 'Success':
        if (requestType === 'CardPayment' || requestType === 'PaymentRefund') {
          socketDisplay.send(
            JSON.stringify({
              name: 'AUTHORISED',
              payload: {},
            })
          )

          // Send total amount event to be tracked
          window.dispatchEvent(
            new CustomEvent('ccv-total-amount', {
              detail: currentTransaction,
            })
          )
        } else if (requestType === 'TicketReprint') {
          console.log(
            'TCL: openTunnelConnection -> TicketReprint : Just reprint: ',
            justReprint
          )
          if (!justReprint) {
            cardServiceRequest(socketDisplay, currentPayment)
          }
        }
        break
      case 'PrintLastTicket':
        isReprinting = true
        try {
          const tunnel = await openTunnelConnection()

          tunnel.on('connect', () => {
            const _data = rePrintXml(
              Number(localStorage.getItem('requestID')) + 1,
              args.deviceName,
              args.languageCode,
              'TicketReprint',
              'Available',
              'Available'
            )

            console.log('openTunnelConnection -> _data', _data)

            const dataToByte = xmlToByteArray(_data)

            tunnel.write(dataToByte)
          })
        } catch (e) {
          console.error(e)
        }
        break
      case 'Failure':
      case 'Aborted':
      case 'TimedOut':
        socketDisplay.send(
          JSON.stringify({
            name: 'TIMEOUT',
            payload: arrayBufferToString(data),
          })
        )
        break
      case 'FormatError':
      case 'ParsingError':
      case 'ValidationError':
      case 'DeviceUnavailable':
      case 'MissingMandatoryData':
        socketDisplay.send(
          JSON.stringify({
            name: 'ERROR',
            payload: arrayBufferToString(data),
          })
        )
        break

      default:
        break
    }
  })

  mainTunnel.on('timeout', () => {
    console.log('TCL: openTunnelConnection -> timeout')
    socketDisplay.send(
      JSON.stringify({
        name: 'TIMEOUT',
        payload: {},
      })
    )
    mainTunnel.destroy()
    mainTunnel.unref()
  })

  mainTunnel.on('close', async () => {
    console.log('TCL: openTunnelConnection -> close')
    mainTunnel.destroy()
    mainTunnel.unref()
  })

  mainTunnel.createdAt = new Date()

  return mainTunnel
}

let listenBuffer = Buffer.alloc(2048)
function readListenerSocket(e, socket) {
  if (e) {
    listenBuffer.write(e)
  }

  if (Buffer.byteLength(e, 'utf8') >= 0) {
    const xml = new DOMParser({
      errorHandler(level, msg) {
        return true
      },
    }).parseFromString(e)

    const overallResult = xml.documentElement.getAttribute('OverallResult')
    const workstationID = xml.documentElement.getAttribute('WorkstationID')

    const requestType = xml.documentElement.getAttribute('RequestType')
    const requestId = xml.documentElement.getAttribute('RequestID')

    const outputElements = xml.documentElement.getElementsByTagName('Output')

    if (!outputElements.item(0)) {
      return
    }

    const outDeviceTarget = outputElements
      .item(0)
      .getAttribute('OutDeviceTarget')

    // Custom Event
    const ccvSockets = new CustomEvent('ccv-messages', { detail: e })

    // Dispatch the event
    window.dispatchEvent(ccvSockets)

    if (outDeviceTarget === 'CashierDisplay') {
      const lineOne =
        xml.documentElement.getElementsByTagName('TextLine') &&
        xml.documentElement.getElementsByTagName('TextLine').item(0)
          ? xml.documentElement.getElementsByTagName('TextLine').item(0)
              .textContent
          : ''

      const lineTwo =
        xml.documentElement.getElementsByTagName('TextLine') &&
        xml.documentElement.getElementsByTagName('TextLine').item(1)
          ? xml.documentElement.getElementsByTagName('TextLine').item(1)
              .textContent
          : ''

      const msg = lineOne.trim() !== '' ? `${lineOne} - ${lineTwo}` : lineTwo
      const status = lineOne.trim() !== '' ? lineOne : lineTwo

      if (status.trim() !== 'REPRINT LAST') {
        socketDisplay.send(
          JSON.stringify({
            name: 'CashierDisplay',
            payload: msg,
            status,
          })
        )
      }
    } else if (outDeviceTarget === 'Printer') {
      socketDisplay.send(
        JSON.stringify({
          name: 'Printer',
          type: requestType,
          overall: overallResult,
          payload: unescape(xml),
        })
      )

      // if (isReprinting) {
      //   console.log('#####Reprinting')
      //   // cardServiceRequest(socketDisplay, currentPayment)

      //   isReprinting = false
      // }
    }

    const transactionData = DeviceResponseXml(
      workstationID,
      requestId,
      requestType,
      'Success',
      outDeviceTarget,
      'Success'
    )

    const dataToByte = xmlToByteArray(transactionData)

    socket.write(dataToByte)

    listenBuffer = new Buffer.alloc(2048) // eslint-disable-line new-cap
  }
}

/**
 * On Listener socket have a connection we start to buffer DeviceRequest's and
 * sending DeviceResponse
 * @param  {Socket} socket Listener socket connected
 * @return {void}
 */
function onClientConnected(socket) {
  let body = ''

  socket.setEncoding('utf8')

  socket.setTimeout(T2)
  console.log('TCL: onClientConnected -> socket.setTimeout(T2)', T2)

  socket.on('data', (chunk) => {
    body += chunk

    readListenerSocket(body, socket)
  })

  socket.on('error', (e) => {
    console.log('####Error - ', e)
  })
}
