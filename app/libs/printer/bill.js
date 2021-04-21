import CONSTS from '../../utils/consts'
const escpos = require('escpos')
const printUtils = require('./printUtils')

export default (ws, localPrinter, bill, logError) => {
  const { currency } = bill
  const paperSize = localPrinter.paper_size ? localPrinter.paper_size : 48
  const billImage = bill.header.find(
    header => header.type === CONSTS.IMAGE && header.content !== ''
  )
  const printHeaderImage = billImage ? billImage.content : CONSTS.DEFAULT_IMAGE

  printUtils.setPaperSize(paperSize)
  printUtils.connectPrinter(localPrinter.device, localPrinter.isUSB).then(
    printer => {
      escpos.Image.load(printHeaderImage, image => {
        // Headers
        bill.header.forEach(header => {
          if (header.type === CONSTS.IMAGE) {
            printer.align(CONSTS.CT)
            printer.image(image, 'd24')
          } else if (header.type === CONSTS.TEXT && header.content !== '') {
            const align = printUtils.getStyleAlign(header)
            const size = printUtils.getStyleSize(header)
            const style = printUtils.getStyleStyle(header)
            printUtils.printLine(
              printer,
              header.content,
              align,
              size.width,
              size.height,
              style,
              CONSTS.FONT_A
            )
          }
        })

        // Date and bill
        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        const time = new Date()
        const formatedTime = printUtils.returnFormatedDate(time)
        // Date
        printUtils.printLine(printer, formatedTime, CONSTS.CT, 1, 1, CONSTS.BOLD, CONSTS.FONT_B)

        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        // Items
        bill.items.forEach(item => {
          // item name
          const times = item.soldsold_by_weight ? 'gr' : ' x'
          const itemLineLeft = `${item.amount}${times} ${item.name}`
          const itemLineRight = `${currency} ${printUtils.returnItemTotalPrice(item)}`

          printUtils.printSpacesBetweenTexts(
            printer,
            itemLineLeft,
            itemLineRight,
            CONSTS.BOLD,
            CONSTS.FONT_A
          )

          // Variant name
          if (item.current_variant && item.current_variant.name) {
            if (item.current_variant.name !== 'Default') {
              printUtils.printLine(
                printer,
                `   ${item.current_variant.name}`,
                CONSTS.LT,
                1,
                1,
                CONSTS.NORMAL,
                CONSTS.FONT_B
              )
            }
          }

          const basePrice = `   @ ${currency} ${parseFloat(
            printUtils.returnItemBasePrice(item) - item.deposit
          ).toFixed(2)}`
          printUtils.printLine(printer, basePrice, CONSTS.LT, 1, 1, CONSTS.NORMAL, CONSTS.FONT_B)

          // addons
          const { addons } = item
          if (addons && addons.length) {
            addons.forEach(addon => {
              const addonLine = `   + ${addon.amount} x ${addon.name} (${currency} ${parseFloat(
                addon.price
              ).toFixed(2)})`
              printUtils.printLine(
                printer,
                addonLine,
                CONSTS.LT,
                1,
                1,
                CONSTS.NORMAL,
                CONSTS.FONT_B
              )
            })
          }

          if (item.deposit && item.deposit > 0) {
            const depositLine = `   + ${bill.langs.deposit}: ${currency} ${parseFloat(
              item.deposit
            ).toFixed(2)}`
            printUtils.printLine(
              printer,
              depositLine,
              CONSTS.LT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          }

          // note
          if (item.note && item.note.length) {
            const noteLine = `   *** ${item.note} ***`
            printUtils.printLine(printer, noteLine, CONSTS.LT, 1, 1, CONSTS.NORMAL, CONSTS.FONT_B)
          }

          if (bill.printEAN && item.ean && item.ean.length) {
            const eanLine = `   EAN: ${item.ean}`
            printUtils.printLine(printer, eanLine, CONSTS.LT, 1, 1, CONSTS.NORMAL, CONSTS.FONT_B)
          }

          if (item.discount && item.discount > 0) {
            const discountLineLeft = `   ${bill.langs.discount} ${(item.discount * 100).toFixed(
              2
            )}%`
            const discountLineRight = `-${currency} ${parseFloat(
              printUtils.returnItemTotalPrice(item) * item.discount
            ).toFixed(2)}`
            printUtils.printSpacesBetweenTexts(
              printer,
              discountLineLeft,
              discountLineRight,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          }

          if (!!item.description) {
            printUtils.printLine(
              printer,
              item.description,
              CONSTS.LT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          }
        })

        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        // Total, subtotal, discount, ...
        // Discount
        if (bill.total.discount && bill.total.discount !== 0) {
          const discountLeft = `${bill.langs.discount} ${(bill.total.discount * 100).toFixed(2)}%`
          const discountRight = `-${currency} ${Number(
            bill.total.total * (bill.total.discount / (1 - bill.total.discount))
          ).toFixed(2)}`
          printUtils.printSpacesBetweenTexts(
            printer,
            discountLeft,
            discountRight,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        if (!!bill.deliveryCost) {
          printUtils.printSpacesBetweenTexts(
            printer,
            bill.langs.deli,
            `${currency} ${parseFloat(bill.deliveryCost).toFixed(2)}`,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        // Subtotal
        printUtils.printSpacesBetweenTexts(
          printer,
          bill.langs.subtotal,
          `${currency} ${parseFloat(bill.total.sub_total).toFixed(2)}`,
          CONSTS.NORMAL,
          CONSTS.FONT_A
        )

        // Taxes total
        const totalTaxes = bill.total.taxes.reduce((acc, tax) => acc + tax.amount, 0)
        printUtils.printSpacesBetweenTexts(
          printer,
          bill.langs.tax,
          `${currency} ${parseFloat(totalTaxes).toFixed(2)}`,
          CONSTS.NORMAL,
          CONSTS.FONT_A
        )

        // Transaction Fee
        if (!!bill.transactionFee) {
          printUtils.printSpacesBetweenTexts(
            printer,
            bill.langs.transactionFee,
            `${currency} ${parseFloat(bill.transactionFee).toFixed(2)}`,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        // Total
        printUtils.printSpacesBetweenTexts(
          printer,
          bill.langs.total,
          `${currency} ${parseFloat(bill.total.total).toFixed(2)}`,
          CONSTS.BOLD,
          CONSTS.FONT_A
        )

        printUtils.lineFeed(printer)

        let netto = 0
        let btw = 0
        let tot = 0

        // Taxes table
        const taxRate = bill.langs.tax_rate || 'BTW %'
        const net = bill.langs.net || 'Netto'
        const th = [ taxRate, net, bill.langs.tax, bill.langs.total ]
        const lines = bill.total.taxes.map(tax => {
          const rate = tax.name.split(' - ')[1]

          netto += tax.above
          btw += tax.amount
          tot += tax.above + tax.amount

          return [
            rate,
            `${currency} ${tax.above.toFixed(2)}`,
            `${currency} ${tax.amount.toFixed(2)}`,
            `${currency} ${(tax.above + tax.amount).toFixed(2)}`
          ]
        })
        const tf = [
          bill.langs.total,
          `${currency} ${netto.toFixed(2)}`,
          `${currency} ${btw.toFixed(2)}`,
          `${currency} ${tot.toFixed(2)}`
        ]
        printUtils.printTable(printer, 4, th, lines, tf)

        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        if (bill.delivery) {
          printUtils.printLine(
            printer,
            bill.langs.delivery_details,
            CONSTS.CT,
            1,
            1,
            CONSTS.BOLD,
            CONSTS.FONT_A
          )
          printUtils.lineFeed(printer)

          // Loop in delivery obj and print everything inside it
          Object.keys(bill.delivery).forEach((deliveryKey, index) => {
            // If has euro symblo, replace it from EUR
            const deliveryValue = printUtils.revemoFromString(
              bill.delivery[deliveryKey],
              '€',
              `${currency} `
            )

            printUtils.printSpacesBetweenTexts(
              printer,
              bill.langs.delivery[index],
              deliveryValue,
              CONSTS.NORMAL,
              CONSTS.FONT_A
            )
          })

          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        // Footer
        bill.footer.forEach(footer => {
          if (footer.type === CONSTS.IMAGE) {
            printer.align(CONSTS.CT)
            printer.image(image, 'd24')
          } else if (footer.type === CONSTS.TEXT && footer.content !== '') {
            const align = printUtils.getStyleAlign(footer)
            const size = printUtils.getStyleSize(footer)
            const style = printUtils.getStyleStyle(footer)
            printUtils.printLine(
              printer,
              footer.content,
              align,
              size.width,
              size.height,
              style,
              CONSTS.FONT_A
            )
          }
        })

        if (bill.footer.length) {
          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        // PROVISIONAL MARK
        printUtils.printLine(
          printer,
          CONSTS.PROVISIONAL,
          CONSTS.CT,
          2,
          2,
          CONSTS.BOLD,
          CONSTS.FONT_A
        )

        printUtils.finishReceipt(printer)
      })

      const event = JSON.stringify({
        event: CONSTS.PRINT_EVENTS.BILL,
        success: true
      })
      ws.send(event)
    },
    error => {
      logError(error.stack, `### Print Bill: ${error.message}`)
      const event = JSON.stringify({
        event: CONSTS.PRINT_EVENTS.BILL,
        success: false,
        error: error.message
      })
      ws.send(event)
    }
  )
}
