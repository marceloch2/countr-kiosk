const printUtils = require('./../printUtils')

/**
 *
 * @param {object} printer Instace of printer object
 * @param {object} order object with Order
 * @param {array} parsedItems Array with parsed items
 */
export default (printer, order, parsedItems, paperSize) => {
  printUtils.setPaperSize(paperSize)
  const time = new Date()

  // Print items
  const itemsToPrint = parsedItems.length ? parsedItems : order.items
  itemsToPrint.reverse().forEach(item => {
    let a = 1
    while (a <= item.amount) {
      // Order number
      printUtils.printLine(
        printer,
        `ORDER: ${order.table}`,
        'ct',
        2,
        2,
        'b',
        'A'
      )
      printUtils.lineFeed(printer)

      // Receipt and date
      const receipt = `Receipt: #${order.receipt_id}`
      const date = printUtils.returnFieldFormatedDate('Date', time)
      printUtils.printLine(printer, receipt, 'lt', 1, 1, 'normal', 'A')
      printUtils.printLine(printer, date, 'lt', 1, 1, 'normal', 'A')

      printUtils.underlineFeed(printer)
      printUtils.lineFeed(printer)

      // item name/variant
      const itemLine = `${
        order.reprint ? '[[!REPRINT]] ' : ''
      }1 x ${printUtils.returnItemName(item)}`
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

      printUtils.underlineFeed(printer)
      printUtils.lineFeed(printer)
      printUtils.cutReceipt(printer)

      a += 1
    }
  })

  printer.close()
}
