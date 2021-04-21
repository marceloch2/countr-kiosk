const escpos = require('escpos')

export default localPrinter => {
  const options = { encoding: 'ISO-8859-1' /* default */ }

  localPrinter.ip.printers_saved.forEach(_printer => {
    const device = new escpos.Network(_printer.device)
    const printer = new escpos.Printer(device, options)

    device.open(() => {
      console.log('### Manual open cash drawer')
      printer.cashdraw(2).close()
    })
  })
}
