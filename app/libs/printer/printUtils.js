const escpos = require('escpos')
const TIMEOUT_PRINTER = 1000
const DEFAULT_MAX_SIZE = 48
const DEFAULT_ENCODE = '857'
const FONT_A = 'A'
const FONT_B = 'B'
const NORMAL = 'NORMAL'
const BOLD = 'B'
const UNDERLINE = 'U'
const UNDERLINE2 = 'U2'
const CT = 'ct'
const LT = 'lt'
const RT = 'rt'

class PrintUtils {
  paperSize = DEFAULT_MAX_SIZE

  static connectPrinter(address, isUSB = false) {
    return new Promise((resolve, reject) => {
      return isUSB
        ? this.connectUSBPrinter(resolve, reject)
        : this.connectNetworkPrinter(address, resolve, reject)
    })
  }

  static connectNetworkPrinter(address, resolve, reject) {
    const options = { encoding: 'ISO-8859-1' /* default */ }
    const connection = new escpos.Network(address)
    const printer = new escpos.Printer(connection, options)

    connection.open((err) => {
      if (err) {
        console.log(err)
        return reject(err)
      }

      return resolve(printer)
    })

    connection.device.setTimeout(TIMEOUT_PRINTER, () => {
      connection.device.destroy()
      const message = 'Timeout connection - address: ' + address
      const err = new Error(message)
      console.log(err)
      return reject(err)
    })

    connection.device.once('connect', () => {
      console.log('socket connect to printer')
      connection.device.setTimeout(0)
      return resolve(printer)
    })
  }

  static connectUSBPrinter(resolve, reject) {
    const options = { encoding: 'ISO-8859-1' /* default */ }
    const connection = new escpos.USB()
    const printer = new escpos.Printer(connection, options)

    connection.open((err) => {
      if (err) {
        console.log(err)
        return reject(err)
      }

      return resolve(printer)
    })
  }

  static getPaperSize() {
    return this.paperSize
  }

  static setPaperSize(size) {
    this.paperSize = size
  }

  static chunkSubstr(str, size) {
    const strTrim = str.trim()
    const numChunks = Math.ceil(strTrim.length / size)
    const chunks = new Array(numChunks)

    // eslint-disable-next-line no-plusplus
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = strTrim.substr(o, size).trim()
    }

    return chunks
  }

  static lineFeed(printer) {
    printer.size(1).font(FONT_A).style(NORMAL).text(' ')
  }

  static underlineFeed(printer) {
    const spaces = ' '.repeat(this.paperSize)
    printer.size(1).font(FONT_A).style(UNDERLINE).text(spaces)
  }

  static underlineBoldFeed(printer) {
    const spaces = ' '.repeat(this.paperSize)
    printer.size(1).font(FONT_A).style(UNDERLINE2).text(spaces)
  }

  static cutReceipt(printer) {
    printer.size(1).text(' ').cut()
  }

  static finishReceipt(printer) {
    printer.size(1).style(NORMAL).text(' ').cut().flush().close()
  }

  static printLine(printer, text, align, width, height, style, font) {
    printer.align(align).font(font).style(style)

    // Font style and font family just can be applied with SIZE(1) -> WITHOUT HEIGHT PARAMETER
    if (width > 1 || height > 1) {
      printer.size(width, height)
    } else {
      printer.size(width)
    }

    printer.text(text, DEFAULT_ENCODE)
  }

  static printSpacesBetweenTexts(printer, leftText, rightText, style, font) {
    let currentSpace = this.paperSize * (font === FONT_B ? 1.34 : 1)
    // line = "text left" + "    " + "text right"
    let printLineSize = leftText.length + rightText.length + 4

    if (printLineSize <= currentSpace) {
      currentSpace -= printLineSize

      const spaces = ' '.repeat(currentSpace < 0 ? 0 : currentSpace + 4)

      printer
        .align(LT)
        .font(font)
        .style(style)
        .size(1)
        .print(leftText, DEFAULT_ENCODE)
        .print(spaces, DEFAULT_ENCODE)
        .text(rightText, DEFAULT_ENCODE)
    } else {
      // Need to crop left text and put it in the next line
      // TL1 is the size of left text of the first line
      const tl1 = currentSpace - (rightText.length + 4)

      printLineSize = tl1 + rightText.length
      currentSpace -= printLineSize
      const spaces = ' '.repeat(currentSpace < 0 ? 0 : currentSpace)

      printer
        .align(LT)
        .font(font)
        .style(style)
        .size(1)
        .print(leftText.substr(0, tl1), DEFAULT_ENCODE)
        .print(spaces, DEFAULT_ENCODE)
        .text(rightText, DEFAULT_ENCODE)
        .text(leftText.substr(tl1), DEFAULT_ENCODE)
    }
  }

  static printTable(printer, columnsNum, th, lines, tf) {
    const maxSize = this.paperSize
    const columnSize = maxSize / columnsNum

    // Header
    th.map((item, index) => {
      let itemCell = item
      if (item.length < columnSize) {
        itemCell = this.completeWithSpaces(item, columnSize - item.length)
      }

      if (index === th.length - 1) {
        printer
          .align(LT)
          .font(FONT_A)
          .style('BU')
          .size(1)
          .text(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
      } else {
        printer
          .align(LT)
          .font(FONT_A)
          .style('BU')
          .size(1)
          .print(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
      }

      return ''
    })

    // Lines
    lines.map((line) => {
      line.map((item, index) => {
        let itemCell = item
        if (item.length < columnSize) {
          itemCell = this.completeWithSpaces(item, columnSize - item.length)
        }

        if (index === th.length - 1) {
          printer
            .align(LT)
            .font(FONT_A)
            .style(NORMAL)
            .size(1)
            .text(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
        } else {
          printer
            .align(LT)
            .font(FONT_A)
            .style(NORMAL)
            .size(1)
            .print(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
        }

        return ''
      })

      return ''
    })

    // Header
    tf.map((item, index) => {
      let itemCell = item
      if (item.length < columnSize) {
        itemCell = this.completeWithSpaces(item, columnSize - item.length)
      }

      if (index === th.length - 1) {
        printer
          .align(LT)
          .font(FONT_A)
          .style('BU')
          .size(1)
          .text(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
      } else {
        printer
          .align(LT)
          .font(FONT_A)
          .style('BU')
          .size(1)
          .print(this.cropTableCell(itemCell, columnSize), DEFAULT_ENCODE)
      }

      return ''
    })
  }

  static printQRCode(printer, qrcode) {
    printer
      .align(CT)
      .qrimage(qrcode, { type: 'png', size: 10 }, function (err) {
        this.cut()
        this.close()
      })
  }

  static completeWithSpaces(item, num) {
    return `${item}${' '.repeat(num)}`
  }

  static cropTableCell(item, size) {
    return item.length > size ? item.substr(0, size) : item
  }

  static getStyleAlign(receiptItem) {
    if (receiptItem.style && receiptItem.style.alignment) {
      if (receiptItem.style.alignment === 'center') {
        return CT
      }
      if (receiptItem.style.alignment === 'left') {
        return LT
      }
      if (receiptItem.style.alignment === 'right') {
        return RT
      }
    }

    return CT
  }

  static getStyleSize(receiptItem) {
    if (receiptItem.style && receiptItem.style.fontSize) {
      if (receiptItem.style.fontSize === 's') {
        return { width: 1, height: 1 }
      }
      if (receiptItem.style.fontSize === 'm') {
        return { width: 2, height: 1 }
      }
      if (receiptItem.style.fontSize === 'l') {
        return { width: 2, height: 2 }
      }
    }

    return { width: 1, height: 1 }
  }

  static getStyleStyle(receiptItem) {
    if (
      receiptItem.style &&
      receiptItem.style.fontWeight &&
      receiptItem.style.fontWeight === BOLD
    ) {
      return BOLD
    }

    return NORMAL
  }

  static returnFormatedDate(time) {
    const date = !!time ? time : new Date()
    return `${new Date(date).toLocaleDateString()} - ${new Date(
      date
    ).toLocaleTimeString()}`
  }

  static returnFieldFormatedDate(field, time) {
    return `${field}: ${new Date(time).toLocaleDateString()} - ${new Date(
      time
    ).toLocaleTimeString()}`
  }

  static returnItemName(item) {
    const product = item.product ? item.product : item
    const variant = item.product
      ? item.product.current_variant
      : item.current_variant
    return variant.default ? product.name : `${product.name}/${variant.name}`
  }

  static returnItemBasePrice(item) {
    return (
      item.price +
      (item.addons && item.addons.length > 0
        ? item.addons.reduce(
            (old, current) => old + current.price * current.amount,
            0
          )
        : 0)
    )
  }

  static returnItemTotalPrice(item) {
    return parseFloat(this.returnItemBasePrice(item) * item.amount).toFixed(2)
  }

  static revemoFromString(str, from, to) {
    if (str.indexOf(from) >= 0) {
      return str.replace(from, to)
    }

    return str
  }
}

module.exports = PrintUtils
