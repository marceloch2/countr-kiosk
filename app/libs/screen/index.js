const escpos = require('escpos')

export default (payload) => {
  const options = { encoding: 'ISO-8859-1' /* default */ }
  // const serialDevice = new escpos.Serial('/dev/cu.usbserial')
  const serialDevice = new escpos.Serial(payload.port)
  const serialScreen = new escpos.Screen(serialDevice, options)

  serialDevice.open((err) => {
    if (err) {
      throw err
    }
    console.log(payload)

    console.log('SCREEN CONNECTED')
    serialScreen.clear()
    serialScreen.moveHome()
    serialScreen.text(payload.line1)
    serialScreen.text(payload.line2)
    serialScreen.close(() => {
      console.log('SCREEN CLOSED')
    })
  })
}
