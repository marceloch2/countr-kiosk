import CONSTS from '../../utils/consts'
const printUtils = require('./printUtils')

/**
 *
 * @param {String} local_printer Ip for local printer connection
 * @param {object} Json object with Order
 */
export default (ws, localPrinter, logError) => {
  if (typeof localPrinter === 'object') {
    let device = localPrinter
    // eslint-disable-next-line no-param-reassign
    localPrinter = []
    localPrinter.push(device)
    device = null
  }

  localPrinter.forEach(_printer => {
    printUtils.connectPrinter(_printer.device, _printer.isUSB).then(
      printer => {
        printer.align('ct').font('A').style('b').size(2, 3).text('PRINT TEST')
        printer
          .size(1)
          .font('A')
          .style('normal')
          .size(1, 1)
          .text(_printer.isUSB ? 'USB PRINTER' : _printer.device)
        printer.size(1).text(' '.repeat(34))
        printer.size(1).text(' '.repeat(34))
        printer.size(1).text(' '.repeat(34)).cut().flush().close()

        const event = JSON.stringify({
          event: CONSTS.PRINT_EVENTS.TEST,
          success: true
        })
        ws.send(event)
      },
      error => {
        logError(error.stack, `### Print Test: ${error.message}`)
        const event = JSON.stringify({
          event: CONSTS.PRINT_EVENTS.TEST,
          success: false,
          error: error.message
        })
        ws.send(event)
      }
    )
  })
}
