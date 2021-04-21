import CONSTS from '../../utils/consts'
const printUtils = require('./printUtils')

const normalSize = String.fromCharCode.apply(null, [ 0x1d, 0x21, 0x00 ])
const doubleSize = String.fromCharCode.apply(null, [ 0x1d, 0x21, 0x11 ])
const tripleSize = String.fromCharCode.apply(null, [ 0x1d, 0x21, 0x22 ])
const noUnderline = String.fromCharCode.apply(null, [ 0x1b, 0x2d, 0x00 ])
const underline = String.fromCharCode.apply(null, [ 0x1b, 0x2d, 0x02 ])
const noEmphasise = String.fromCharCode.apply(null, [ 0x1b, 0x45, 0x00 ])
const emphasise = String.fromCharCode.apply(null, [ 0x1b, 0x45, 0x01 ])
const noItalics = String.fromCharCode.apply(null, [ 0x1b, 0x34, 0x00 ])
const italics = String.fromCharCode.apply(null, [ 0x1b, 0x34, 0x01 ])
const left = String.fromCharCode.apply(null, [ 0x1b, 0x61, 0x00 ])
const center = String.fromCharCode.apply(null, [ 0x1b, 0x61, 0x01 ])
const right = String.fromCharCode.apply(null, [ 0x1b, 0x61, 0x02 ])
const lineBreak = String.fromCharCode.apply(null, [ 0x0a ])
const resetPrinter = String.fromCharCode.apply(null, [ 0x1b, 0x40 ]) // Reset (1b 40)
const setCharPage = String.fromCharCode.apply(null, [ 0x1b, 0x74, 0x0f ]) // Change codepage (1b 74 0f)
const fontA = String.fromCharCode.apply(null, [ 0x1b, 0x21, 0x00 ])
const fontB = String.fromCharCode.apply(null, [ 0x1b, 0x21, 0x01 ])

const printerStatus = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x01 ])
const offlinePrinterStatus = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x02 ])
const errorStatus = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x03 ])
const printerPaperStatus = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x04 ])
const printStatus = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x11 ]) // 17
const printerStatusFull = String.fromCharCode.apply(null, [ 0x10, 0x04, 0x14 ]) // 20

const qrCodeModel = String.fromCharCode.apply(null, [
  0x1d,
  0x28,
  0x6b,
  0x04,
  0x00,
  0x31,
  0x41,
  0x32,
  0x00
])
const qrCodeSize = String.fromCharCode.apply(null, [
  0x1d,
  0x28,
  0x6b,
  0x03,
  0x00,
  0x31,
  0x43,
  0x09
]) // Last param is dot size
const qrCodeErrorCorrection = String.fromCharCode.apply(null, [
  0x1d,
  0x28,
  0x6b,
  0x03,
  0x00,
  0x31,
  0x44,
  0x30
])
const qrCodeData1 = String.fromCharCode.apply(null, [ 0x1d, 0x28, 0x6b ]) // + size1 + size2
const qrCodeData2 = String.fromCharCode.apply(null, [ 0x31, 0x50, 0x30 ]) // + QR data
const qrPrintSymbol = String.fromCharCode.apply(null, [
  0x1d,
  0x28,
  0x6b,
  0x03,
  0x00,
  0x31,
  0x51,
  0x30
])
const qrTransmitSize = String.fromCharCode.apply(null, [
  0x1d,
  0x28,
  0x6b,
  0x03,
  0x00,
  0x31,
  0x52,
  0x30
])

export default () => {
  let totalWidth = 42
  let currency = 'EUR'

  return {
    /**
     *
     * @param {String} localPrinter Ip for local printer connection
     * @param {object} Json object with report
     */
    printReport(ws, localPrinter, report, logError) {
      totalWidth = 56
      currency = report.currency || 'EUR'

      printUtils.connectPrinter(localPrinter.device, localPrinter.isUSB).then(
        printer => {
          const dataToPrint = this.generateReportCommands(report)
          printer
            .size(1)
            .pureText(dataToPrint)
            .flush(() => {
              console.log('flush in report')
            })
            .cut()
            .close()

          const event = JSON.stringify({
            event: CONSTS.PRINT_EVENTS.REPORT,
            success: true
          })
          ws.send(event)
        },
        error => {
          logError(error.stack, `### Print Report: ${error.message}`)
          const event = JSON.stringify({
            event: CONSTS.PRINT_EVENTS.REPORT,
            success: false,
            error: error.message
          })
          ws.send(event)
        }
      )
    },
    spacesBetween(str1, str2) {
      let ret = ''
      if (str1.length + str2.length <= totalWidth) {
        ret = str1 + ' '.repeat(totalWidth - (str1.length + str2.length)) + str2
      } else {
        ret = `${str1} ${str2}`
      }
      return ret
    },
    addHorizontalLine() {
      let dashLine = ''

      for (i = 0; i < totalWidth; i++) {
        dashLine += ' '
      }

      const cmd_req = center + noUnderline + dashLine + lineBreak

      return cmd_req
    },
    getReportType(days) {
      if (days === 1) {
        return 'Day'
      } else if (days > 1 && days <= 7) {
        return 'Week'
      } else {
        return 'Month'
      }
    },
    returnMaxCellStrint(str, columns) {
      const maxWidthTable = Math.floor(totalWidth / columns)
      if (str.length <= maxWidthTable) {
        return str + ' '.repeat(maxWidthTable - str.length)
      }
      return str.substring(0, maxWidthTable)
    },
    generateReportCommands(report) {
      const start_date = new Date(report.start_date)
      const end_date = new Date(report.end_date)
      const timeDiff = Math.abs(end_date.getTime() - start_date.getTime())
      const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24))

      const transactions = report.content[currency].tables.transaction_by_method
      const payments = report.content[currency].tables.payment_by_method
      const refunds = report.content[currency].tables.refund_by_method
      const taxes = report.content[currency].tables.product_by_taxes
      const categories = report.content[currency].tables.product_by_category

      let cmd_req = fontA + center
      cmd_req += fontB // Switch to Font B

      // TItle
      cmd_req += `${center +
        emphasise +
        normalSize}Report${lineBreak}${start_date.toLocaleDateString()}${lineBreak}${this.getReportType(
        diffDays
      )}${lineBreak}`

      cmd_req +=
        this.getTransactions('TRANSACTIONS', transactions, transactions.details) + lineBreak

      cmd_req += this.getTransactions('PAYMENTS', payments, payments.details) + lineBreak
      cmd_req += this.getTransactions('REFUNDS', refunds, refunds.details) + lineBreak
      cmd_req += this.getTaxes('TAXES', taxes, taxes.details) + lineBreak
      cmd_req += this.getCategories(categories) + lineBreak

      return cmd_req
    },
    getTransactions(type, transactions, details) {
      const _isNested = detailsType => {
        return !!detailsType.details
      }

      let cmd_req = fontB + left + lineBreak

      cmd_req +=
        emphasise +
        left +
        underline +
        this.returnMaxCellStrint(type, 3) +
        this.returnMaxCellStrint('AMOUNT', 3) +
        this.returnMaxCellStrint('NUMBER', 3) +
        noUnderline +
        noEmphasise +
        lineBreak +
        fontB

      Object.keys(details).forEach(method => {
        if (details[method] && method !== 'isTable' && !_isNested(details[method])) {
          cmd_req +=
            left +
            this.returnMaxCellStrint(method, 3) +
            this.returnMaxCellStrint(`${currency} ${details[method].amount.toFixed(2)}`, 3) +
            this.returnMaxCellStrint(`${details[method].number}`, 3) +
            lineBreak
        } else if (_isNested(details[method])) {
          Object.keys(details[method].details).forEach(nested => {
            cmd_req +=
              left +
              this.returnMaxCellStrint(nested, 3) +
              this.returnMaxCellStrint(
                `${currency} ${details[method].details[nested].amount.toFixed(2)}`,
                3
              ) +
              this.returnMaxCellStrint(`${details[method].details[nested].number}`, 3) +
              lineBreak
          })
        }
      })

      if (Object.keys(details).length) {
        cmd_req +=
          left +
          emphasise +
          this.returnMaxCellStrint('TOTAL', 3) +
          this.returnMaxCellStrint(`${currency} ${transactions.summary.amount.toFixed(2)}`, 3) +
          this.returnMaxCellStrint(`${transactions.summary.number}`, 3) +
          noEmphasise
        lineBreak
      }

      return cmd_req
    },
    getTaxes(type, transactions, details) {
      let cmd_req = fontB + left + lineBreak

      cmd_req +=
        emphasise +
        left +
        underline +
        this.returnMaxCellStrint(type, 4) +
        this.returnMaxCellStrint('AMOUNT', 4) +
        this.returnMaxCellStrint('PRETAX', 4) +
        this.returnMaxCellStrint('TAXES', 4) +
        noUnderline +
        noEmphasise +
        lineBreak +
        fontB

      Object.keys(details).forEach(tax => {
        if (details[tax] && tax !== 'isTable') {
          cmd_req +=
            left +
            this.returnMaxCellStrint(tax, 4) +
            this.returnMaxCellStrint(`${currency} ${details[tax].amount.toFixed(2)}`, 4) +
            this.returnMaxCellStrint(`${currency} ${details[tax].preTax.toFixed(2)}`, 4) +
            this.returnMaxCellStrint(`${currency} ${details[tax].taxes.toFixed(2)}`, 4) +
            lineBreak
        }
      })

      cmd_req +=
        left +
        emphasise +
        this.returnMaxCellStrint('TOTAL', 4) +
        this.returnMaxCellStrint(`${currency} ${transactions.summary.amount.toFixed(2)}`, 4) +
        this.returnMaxCellStrint(`${currency} ${transactions.summary.preTax.toFixed(2)}`, 4) +
        this.returnMaxCellStrint(`${currency} ${transactions.summary.taxes.toFixed(2)}`, 4) +
        noEmphasise
      lineBreak

      return cmd_req
    },
    getCategories(categories) {
      let cmd_req = fontB + left + lineBreak

      cmd_req +=
        emphasise +
        left +
        underline +
        this.returnMaxCellStrint('CATEGORIES', 4) +
        this.returnMaxCellStrint('AMOUNT', 4) +
        this.returnMaxCellStrint('NUMBER', 4) +
        this.returnMaxCellStrint('PRETAX', 4) +
        noUnderline +
        noEmphasise +
        lineBreak +
        fontB

      Object.keys(categories.details).forEach(category => {
        if (
          categories.details[category] &&
          category !== 'isTable' &&
          category.indexOf('refund') < 0
        ) {
          cmd_req +=
            left +
            this.returnMaxCellStrint(`${categories.details[category].name}`, 4) +
            this.returnMaxCellStrint(
              `${currency} ${categories.details[category].summary.amount.toFixed(2)}`,
              4
            ) +
            this.returnMaxCellStrint(`${categories.details[category].summary.number}`, 4) +
            this.returnMaxCellStrint(
              `${currency} ${categories.details[category].summary.preTax.toFixed(2)}`,
              4
            ) +
            lineBreak
        } else if (
          categories.details[category] &&
          category !== 'isTable' &&
          category.indexOf('refund') >= 0
        ) {
          cmd_req +=
            left +
            this.returnMaxCellStrint(`${categories.details[category].name} (Refund)`, 4) +
            this.returnMaxCellStrint(
              `${currency} ${categories.details[category].summary.amount.toFixed(2)}`,
              4
            ) +
            this.returnMaxCellStrint(`${categories.details[category].summary.number}`, 4) +
            this.returnMaxCellStrint(
              `${currency} ${categories.details[category].summary.preTax.toFixed(2)}`,
              4
            ) +
            lineBreak
        }
      })

      return cmd_req
    }
  }
}
