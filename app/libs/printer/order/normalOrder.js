import CONSTS from '../../../utils/consts'
const printUtils = require('./../printUtils')

/**
 *
 * @param {object} printer Instace of printer object
 * @param {object} order object with Order
 * @param {array} parsedItems Array with parsed items
 * @param {number} paperSize Number to set how many spaces should put
 */
export default (printer, order, parsedItems, paperSize) => {
  printUtils.setPaperSize(paperSize)
  // Order number
  printUtils.printLine(printer, `ORDER: ${order.table}`, 'ct', 2, 2, 'b', 'A')
  printUtils.lineFeed(printer)

  // Delivery/Pickup time
  const receipt = `Receipt: #${order.receipt_id}`
  const date = printUtils.returnFieldFormatedDate('Date', new Date())
  printUtils.printLine(printer, receipt, 'lt', 1, 1, 'normal', 'A')
  printUtils.printLine(printer, date, 'lt', 1, 1, 'normal', 'A')

  if (order.delivery && order.delivery && order.delivery.note != '') {
    printUtils.printLine(printer, `*** ${order.delivery.note} ***`, 'lt', 1, 1, 'normal', 'A')
  }

  printUtils.underlineFeed(printer)
  printUtils.lineFeed(printer)

  // Items
  const items = parsedItems.length ? parsedItems.reverse() : order.items.reverse()

  items.forEach(item => {
    // item name/variant
    const itemLine = `${order.reprint
      ? '[[!REPRINT]] '
      : ''}${item.amount} x ${printUtils.returnItemName(item)}`
    printUtils.printLine(printer, itemLine, 'lt', 2, 1, 'b', 'A')

    // addons
    const { addons } = item
    if (addons && addons.length) {
      addons.forEach(addon => {
        const addonLine = `  + ${addon.amount} x ${addon.name}`
        printUtils.printLine(printer, addonLine, 'lt', 2, 1, 'normal', 'A')
      })
    }

    // note
    if (item.note && item.note.length) {
      const noteLine = `*** ${item.note} ***`
      printUtils.printLine(printer, noteLine, 'lt', 2, 1, 'normal', 'A')
    }
  })

  printUtils.underlineFeed(printer)
  printUtils.lineFeed(printer)

  if (!!order.delivery && !!order.delivery.langs && !!order.delivery.print) {
    printUtils.printLine(
      printer,
      order.delivery.langs.delivery_details,
      CONSTS.CT,
      1,
      1,
      CONSTS.BOLD,
      CONSTS.FONT_A
    )
    printUtils.lineFeed(printer)

    // Loop in delivery obj and print everything inside it
    Object.keys(order.delivery.print).forEach((deliveryKey, index) => {
      // If has euro symblo, replace it from EUR
      const deliveryValue = printUtils.revemoFromString(
        order.delivery.print[deliveryKey],
        '€',
        `${order.delivery.currency} `
      )

      printUtils.printSpacesBetweenTexts(
        printer,
        order.delivery.langs.delivery[index],
        deliveryValue,
        CONSTS.NORMAL,
        CONSTS.FONT_A
      )
    })

    printUtils.underlineBoldFeed(printer)
    printUtils.lineFeed(printer)

    if (!!order.delivery.toPay) {
      printUtils.printLine(printer, '*** TO PAY ***', CONSTS.CT, 2, 2, CONSTS.BOLD, CONSTS.FONT_A)
      printUtils.lineFeed(printer)
    }
  }

  printUtils.finishReceipt(printer)
}
