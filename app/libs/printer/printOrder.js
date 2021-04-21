import normalOrder from './order/normalOrder'
import splitItemsOrder from './order/splitItemsOrder'
import splitAmountOrder from './order/splitAmountOrder'
import CONSTS from '../../utils/consts'
const printUtils = require('./printUtils')

/**
 *
 * @param {String} local_printer Ip for local printer connection
 * @param {object} Json object with Order
 */
export default (ws, localPrinter, order, logError) => {
  if (typeof localPrinter === 'object') {
    let device = localPrinter
    // eslint-disable-next-line no-param-reassign
    localPrinter = []
    localPrinter.push(device)
    device = null
  }

  const parsedItems = []

  localPrinter.forEach(_printer => {
    if (_printer.printSpecificCategories) {
      const printerCategories = _printer.categories

      order.items.forEach(item => {
        item.categories.forEach(cat => {
          if (printerCategories.toString().includes(cat)) {
            parsedItems.push(item)
          }
        })
      })

      if (!parsedItems.length) {
        return
      }
    }

    printUtils.connectPrinter(_printer.device, _printer.isUSB).then(
      printer => {
        const paper_size = localPrinter.paper_size ? localPrinter.paper_size : 48

        if (!order.splitItems && !order.splitAmount) {
          normalOrder(printer, order, parsedItems, paper_size)
        } else if (order.splitItems && !order.splitAmount) {
          splitItemsOrder(printer, order, parsedItems, paper_size)
        } else if (!order.splitItems && order.splitAmount) {
          splitAmountOrder(printer, order, parsedItems, paper_size)
        }

        const event = JSON.stringify({
          event: CONSTS.PRINT_EVENTS.ORDER,
          success: true
        })
        ws.send(event)
      },
      error => {
        logError(error.stack, `### Print Order: ${error.message}`)
        const event = JSON.stringify({
          event: CONSTS.PRINT_EVENTS.ORDER,
          success: false,
          error: error.message
        })
        ws.send(event)
      }
    )
  })
}
