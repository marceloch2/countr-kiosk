import CONSTS from '../../utils/consts'
const escpos = require('escpos')
const printUtils = require('./printUtils')

export default (ws, localPrinter, receipt, logError) => {
  const { currency } = receipt
  const paperSize = localPrinter.paper_size ? localPrinter.paper_size : 48
  const receiptImage = receipt.header.find(
    (header) => header.type === CONSTS.IMAGE && header.content !== ''
  )
  const printHeaderImage = receiptImage
    ? receiptImage.content
    : CONSTS.DEFAULT_IMAGE

  printUtils.setPaperSize(paperSize)
  printUtils.connectPrinter(localPrinter.device, localPrinter.isUSB).then(
    (printer) => {
      escpos.Image.load(printHeaderImage, async (image) => {
        // Headers
        receipt.header.forEach((header) => {
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

        // Date and receipt
        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        const formatedTime = printUtils.returnFormatedDate(receipt.date)
        const receiptId = `${receipt.langs.receipt}: #${receipt.number}`
        let customer =
          receipt.customer && receipt.customer.name && receipt.customer.email
            ? `${receipt.customer.name} (${receipt.customer.email})`
            : null

        // Date
        printUtils.printLine(
          printer,
          formatedTime,
          CONSTS.CT,
          1,
          1,
          CONSTS.BOLD,
          CONSTS.FONT_B
        )
        // Receipt id
        printUtils.printLine(
          printer,
          receiptId,
          CONSTS.CT,
          1,
          1,
          CONSTS.BOLD,
          CONSTS.FONT_B
        )
        // Employee
        if (receipt.employee && receipt.employee !== '') {
          printUtils.printSpacesBetweenTexts(
            printer,
            receipt.langs.employee,
            receipt.employee,
            CONSTS.NORMAL,
            CONSTS.FONT_B
          )
        }
        // Customer
        if (customer) {
          customer =
            customer.indexOf('\n') >= 0
              ? customer
                  .split(' ')
                  .join('')
                  .replace(/(\r\n|\n|\r)/gm, ' ')
              : customer

          printUtils.printSpacesBetweenTexts(
            printer,
            receipt.langs.customer,
            customer,
            CONSTS.NORMAL,
            CONSTS.FONT_B
          )
        }

        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        // Items
        receipt.items.forEach((item) => {
          const times = item.soldsold_by_weight ? 'gr' : ' x'
          const itemLineLeft = `${item.amount}${times} ${item.name}`
          const itemLineRight = `${currency} ${printUtils.returnItemTotalPrice(
            item
          )}`

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

          const deposit = item.deposit ? item.deposit : 0
          const basePrice = `   @ ${currency} ${parseFloat(
            printUtils.returnItemBasePrice(item) - deposit
          ).toFixed(2)}${item.soldsold_by_weight ? '/gr' : ''}`
          printUtils.printLine(
            printer,
            basePrice,
            CONSTS.LT,
            1,
            1,
            CONSTS.NORMAL,
            CONSTS.FONT_B
          )

          // addons
          const { addons } = item
          if (addons && addons.length) {
            addons.forEach((addon) => {
              const addonLine = `   + ${addon.amount} x ${
                addon.name
              } (${currency} ${parseFloat(addon.price).toFixed(2)})`
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
            const depositLine = `   + ${
              receipt.langs.deposit
            }: ${currency} ${parseFloat(item.deposit).toFixed(2)}`
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
            printUtils.printLine(
              printer,
              noteLine,
              CONSTS.LT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          }

          if (receipt.printEAN && item.ean && item.ean.length) {
            const eanLine = `   EAN: ${item.ean}`
            printUtils.printLine(
              printer,
              eanLine,
              CONSTS.LT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          }

          if (item.discount && item.discount > 0) {
            const discountLineLeft = `   ${receipt.langs.discount} ${(
              item.discount * 100
            ).toFixed(2)}%`
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
        if (receipt.total.discount && receipt.total.discount !== 0) {
          const discountLeft = `${receipt.langs.discount} ${(
            receipt.total.discount * 100
          ).toFixed(2)}%`
          const discountRight = `-${currency} ${Number(
            receipt.total.total *
              (receipt.total.discount / (1 - receipt.total.discount))
          ).toFixed(2)}`
          printUtils.printSpacesBetweenTexts(
            printer,
            discountLeft,
            discountRight,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        if (!!receipt.deliveryCost) {
          printUtils.printSpacesBetweenTexts(
            printer,
            receipt.langs.deli,
            `${currency} ${parseFloat(receipt.deliveryCost).toFixed(2)}`,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        // Subtotal
        printUtils.printSpacesBetweenTexts(
          printer,
          receipt.langs.subtotal,
          `${currency} ${parseFloat(receipt.total.sub_total).toFixed(2)}`,
          CONSTS.NORMAL,
          CONSTS.FONT_A
        )

        // Taxes total
        const totalTaxes = receipt.total.taxes.reduce(
          (acc, tax) => acc + tax.amount,
          0
        )
        printUtils.printSpacesBetweenTexts(
          printer,
          receipt.langs.tax,
          `${currency} ${parseFloat(totalTaxes).toFixed(2)}`,
          CONSTS.NORMAL,
          CONSTS.FONT_A
        )

        // Transaction Fee
        if (!!receipt.transactionFee) {
          printUtils.printSpacesBetweenTexts(
            printer,
            receipt.langs.transactionFee,
            `${currency} ${parseFloat(receipt.transactionFee).toFixed(2)}`,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        }

        // Total
        printUtils.printSpacesBetweenTexts(
          printer,
          receipt.langs.total,
          `${currency} ${parseFloat(receipt.total.total).toFixed(2)}`,
          CONSTS.BOLD,
          CONSTS.FONT_A
        )

        printUtils.lineFeed(printer)

        // Paid
        receipt.total.paid.forEach((pay) => {
          const paidLeft = `${receipt.langs.paid} (${pay.type})`
          const paidRight = `${currency} ${parseFloat(pay.value).toFixed(2)}`
          printUtils.printSpacesBetweenTexts(
            printer,
            paidLeft,
            paidRight,
            CONSTS.NORMAL,
            CONSTS.FONT_A
          )
        })

        // Change
        printUtils.printSpacesBetweenTexts(
          printer,
          receipt.langs.change,
          `${currency} ${parseFloat(receipt.total.change).toFixed(2)}`,
          CONSTS.NORMAL,
          CONSTS.FONT_A
        )

        printUtils.lineFeed(printer)

        if (
          receipt.is_partial &&
          receipt.total.remaining_payment &&
          receipt.total.remaining_payment >= 0
        ) {
          // Remaining payment
          printUtils.printSpacesBetweenTexts(
            printer,
            receipt.langs.remaining_payment,
            `${currency} ${parseFloat(receipt.total.remaining_payment).toFixed(
              2
            )}`,
            CONSTS.BOLD,
            CONSTS.FONT_A
          )
          printUtils.lineFeed(printer)
        }

        let netto = 0
        let btw = 0
        let tot = 0

        // Taxes table
        const taxRate = receipt.langs.tax_rate || 'BTW %'
        const net = receipt.langs.net || 'Netto'
        const th = [taxRate, net, receipt.langs.tax, receipt.langs.total]
        const lines = receipt.total.taxes.map((tax) => {
          const rate = tax.name.split(' - ')[1]

          netto += tax.above
          btw += tax.amount
          tot += tax.above + tax.amount

          return [
            rate,
            `${currency} ${tax.above.toFixed(2)}`,
            `${currency} ${tax.amount.toFixed(2)}`,
            `${currency} ${(tax.above + tax.amount).toFixed(2)}`,
          ]
        })
        const tf = [
          receipt.langs.total,
          `${currency} ${netto.toFixed(2)}`,
          `${currency} ${btw.toFixed(2)}`,
          `${currency} ${tot.toFixed(2)}`,
        ]
        printUtils.printTable(printer, 4, th, lines, tf)

        printUtils.underlineBoldFeed(printer)
        printUtils.lineFeed(printer)

        if (receipt.info && receipt.info.length) {
          receipt.info.forEach((info, index) => {
            printUtils.underlineFeed(printer)
            printUtils.lineFeed(printer)
            printUtils.printLine(
              printer,
              `${receipt.langs.payment}: ${index + 1}`,
              CONSTS.CT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_A
            )
            printUtils.underlineFeed(printer)
            printUtils.lineFeed(printer)
            printUtils.printLine(
              printer,
              info,
              CONSTS.CT,
              1,
              1,
              CONSTS.NORMAL,
              CONSTS.FONT_B
            )
          })
          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        if (receipt.fiscal_info && receipt.fiscal_info.length) {
          printUtils.printLine(
            printer,
            receipt.fiscal_info,
            CONSTS.LT,
            1,
            1,
            CONSTS.NORMAL,
            CONSTS.FONT_B
          )
          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        if (receipt.delivery) {
          printUtils.printLine(
            printer,
            receipt.langs.delivery_details,
            CONSTS.CT,
            1,
            1,
            CONSTS.BOLD,
            CONSTS.FONT_A
          )
          printUtils.lineFeed(printer)

          // Loop in delivery obj and print everything inside it
          Object.keys(receipt.delivery).forEach((deliveryKey, index) => {
            // If has euro symblo, replace it from EUR
            const deliveryValue = printUtils.revemoFromString(
              receipt.delivery[deliveryKey],
              '€',
              `${currency} `
            )

            printUtils.printSpacesBetweenTexts(
              printer,
              receipt.langs.delivery[index],
              deliveryValue,
              CONSTS.NORMAL,
              CONSTS.FONT_A
            )
          })

          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        // Footer
        receipt.footer.forEach((footer) => {
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

        if (receipt.footer.length) {
          printUtils.underlineBoldFeed(printer)
          printUtils.lineFeed(printer)
        }

        // Cashdrawer
        if (receipt.openCashDrawer) {
          printer.cashdraw(2)
        }

        if (receipt.reprint) {
          printUtils.lineFeed(printer)
          printUtils.printLine(
            printer,
            '*** REPRINT ***',
            CONSTS.CT,
            2,
            2,
            CONSTS.BOLD,
            CONSTS.FONT_A
          )
          printUtils.underlineBoldFeed(printer)
        }

        if (!!receipt.qr) {
          printUtils.printQRCode(printer, receipt.qr)
        } else {
          printUtils.finishReceipt(printer)
        }

        ws.send(
          JSON.stringify({
            event: CONSTS.PRINT_EVENTS.RECEIPT,
            success: true,
            id: receipt.number,
          })
        )
      })
    },
    (error) => {
      logError(error.stack, `### Print Receipt: ${error.message}`)
      const event = JSON.stringify({
        event: CONSTS.PRINT_EVENTS.RECEIPT,
        success: false,
        error: error.message,
      })
      ws.send(event)
    }
  )
}
