/* eslint-disable no-unused-expressions */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-extend-native */
/* eslint-disable func-names */
/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */
String.prototype.toByteArray =
  String.prototype.toByteArray ||
  function(e) {
    const b = []
    const f = this.length
    let c = 0
    for (b, c, f; c < f; c++) {
      let a = this.charCodeAt(c)
      if (a >= 55296 && a <= 57343 && c + 1 < f && !(a & 1024)) {
        const d = this.charCodeAt(c + 1)
        d >= 55296 &&
          d <= 57343 &&
          d & 1024 &&
          ((a = 65536 + ((a - 55296) << 10) + (d - 56320)), c++)
      }
      a < 128
        ? b.push(a)
        : a < 2048
        ? b.push(192 | (a >> 6), 128 | (a & 63))
        : a < 65536
        ? (a >= 55296 && a <= 57343 && (a = e ? 65534 : 65533),
          b.push(224 | (a >> 12), 128 | ((a >> 6) & 63), 128 | (a & 63)))
        : a > 1114111
        ? b.push(239, 191, 191 ^ (e ? 1 : 2))
        : b.push(
            240 | (a >> 18),
            128 | ((a >> 12) & 63),
            128 | ((a >> 6) & 63),
            128 | (a & 63)
          )
    }
    return b
  }

String.prototype.hexDecode = function() {
  let r = ''
  for (let i = 0; i < this.length; i += 2) {
    r += unescape(`%${this.substr(i, 2)}`)
  }

  return r
}

exports.cardPaymentxml = function(
  requestID,
  workstationID,
  languageCode,
  currency,
  amount,
  requestType,
  printerStatus,
  journalStatus
) {
  return (
    `${'<?xml version="1.0" encoding="utf-8"?>' +
      '<CardServiceRequest WorkstationID="'}${workstationID}" RequestID="${requestID}" RequestType="${requestType}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">` +
    `<POSdata LanguageCode="${languageCode}">` +
    `<POSTimeStamp>${new Date().toISOString()}</POSTimeStamp>` +
    // '<ShiftNumber>0</ShiftNumber>' +
    // '<ClerkID>1</ClerkID>' +
    `<PrinterStatus>${printerStatus}</PrinterStatus>` +
    `<E-JournalStatus>${journalStatus}</E-JournalStatus>` +
    // '<JournalPrinterStatus>' +
    // journalStatus +
    // '</JournalPrinterStatus>' +
    ` </POSdata>${
      requestType.indexOf('AbortRequest') > -1
        ? ''
        : `<TotalAmount Currency="${currency}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">${amount}</TotalAmount>`
    }</CardServiceRequest>`
  )
}

const repeatLastMessageXml = function(
  workstationID,
  requestID,
  languageCode,
  currency,
  amount,
  requestType,
  printerStatus,
  journalStatus
) {
  const xml =
    `${'<?xml version="1.0" encoding="utf-8"?>' +
      '<CardServiceRequest WorkstationID="'}${workstationID}" RequestID="${requestID}" RequestType="${requestType}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">` +
    ` <POSdata LanguageCode="${languageCode}">` +
    `    <POSTimeStamp>${new Date().toISOString()}</POSTimeStamp>` + // "    <ShiftNumber>1</ShiftNumber>" +
    // "    <ClerkID>1</ClerkID>" +
    `    <PrinterStatus>${printerStatus}</PrinterStatus>` +
    `    <E-JournalStatus>${journalStatus}</E-JournalStatus>` + // "    <JournalPrinterStatus>" + journalStatus + "</JournalPrinterStatus>" +
    ` </POSdata>` +
    `<TotalAmount Currency="${currency}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">${amount}</TotalAmount>` +
    `</CardServiceRequest>`

  return xml
}

exports.repeatLastMessage = (device, lang, currency, amount) => {
  const transactionData = repeatLastMessageXml(
    device,
    lang,
    currency,
    amount,
    'RepeatLastMessage',
    'Available',
    'Available'
  )
  return xmlToByteArray(transactionData)
}

exports.DeviceResponseXml = (
  workstationID,
  requestId,
  requestType,
  overallResult,
  outDeviceTarget,
  outResult
) => {
  const xml =
    `${'<?xml version="1.0" encoding="utf-8"?>' +
      '<DeviceResponse WorkstationID="'}${workstationID}" RequestID="${requestId}" RequestType="${requestType}" OverallResult="${overallResult}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">` +
    ` <Output OutDeviceTarget="${outDeviceTarget}" OutResult="${outResult}">` +
    ` </Output>` +
    `</DeviceResponse>`

  return xml
}

const rePrintXml = (exports.rePrintXml = (
  requestId,
  workstationID,
  languageCode,
  requestType,
  printerStatus
) => {
  const xml =
    `${'<?xml version="1.0" encoding="utf-8"?>' +
      '<CardServiceRequest WorkstationID="'}${workstationID}" RequestID="${requestId}" RequestType="${requestType}" xmlns="http://www.nrf-arts.org/IXRetail/namespace">` +
    `<POSdata LanguageCode="${languageCode}">` +
    `<POSTimeStamp>${new Date().toISOString()}</POSTimeStamp>` +
    // "<RequestReceiptHeader>true</RequestReceiptHeader>" +
    `<PrinterStatus>${printerStatus}</PrinterStatus>` +
    `</POSdata>` +
    `</CardServiceRequest>`

  return xml
})

exports.reprintLastTicket = args => {
  const argsObj = args || {}

  const transactionData = rePrintXml(
    argsObj.device,
    argsObj.language,
    argsObj.type,
    'Available',
    'Available',
    argsObj.requestId
  )

  return xmlToByteArray(transactionData)
}

exports.arrayBufferToString = buffer => {
  try {
    const byteArray = new Uint8Array(buffer)
    let str = ''
    let cc = 0
    let numBytes = 0

    for (let i = 4, len = byteArray.length; i < len; ++i) {
      const v = byteArray[i]
      if (numBytes > 0) {
        // 2 bit determining that this is a tailing byte + 6 bit of payload
        if ((cc & 192) === 192) {
          // processing tailing-bytes
          cc = (cc << 6) | (v & 63)
        } else {
          throw new Error('this is no tailing-byte')
        }
      } else if (v < 128) {
        // single-byte
        numBytes = 1
        cc = v
      } else if (v < 192) {
        // these are tailing-bytes
        throw new Error('invalid byte, this is a tailing-byte')
      } else if (v < 224) {
        // 3 bits of header + 5bits of payload
        numBytes = 2
        cc = v & 31
      } else if (v < 240) {
        // 4 bits of header + 4bit of payload
        numBytes = 3
        cc = v & 15
      } else {
        // UTF-8 theoretically supports up to 8 bytes containing up to 42bit of payload
        // but JS can only handle 16bit.
        throw new Error('invalid encoding, value out of range')
      }

      if (--numBytes === 0) {
        str += String.fromCharCode(cc)
      }
    }

    if (numBytes) {
      throw new Error("the bytes don't sum up")
    }

    return str
  } catch (e) {
    return ''
  }
}

const stringToBytesFaster = (exports.stringToBytesFaster = str => {
  let ch
  let st
  let j = 0
  const re = []
  for (let i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i)
    if (ch < 127) {
      re[j++] = ch & 0xff
    } else {
      st = []
      // clear stack
      do {
        st.push(ch & 0xff)
        // push byte to stack
        ch >>= 8
        // shift value down by 1 byte
      } while (ch)
      // add stack contents to result
      // done because chars have "wrong" endianness
      st = st.reverse()
      for (let k = 0; k < st.length; ++k) re[j++] = st[k]
    }
  }
  // return an array of bytes
  return re
})

const xmlToByteArray = (exports.xmlToByteArray = xml => {
  const xmlByteArray = stringToBytesFaster(xml)

  const header = Buffer.alloc(4)
  header[0] = Math.floor(xmlByteArray.length / (256 * 256 * 256))
  header[1] = Math.floor((xmlByteArray.length / (256 * 256)) % 256)
  header[2] = Math.floor((xmlByteArray.length / 256) % 256)
  header[3] = Math.floor(xmlByteArray.length % 256)

  const body = Buffer.alloc(xml.length)
  body.write(xml)

  const request = Buffer.concat([header, body])

  return request
})

/**
 * Get the default language
 */
exports.getLanguage = () => {
  const currentLanguage = navigator.language
  const language = localStorage.getItem('language') || currentLanguage

  return language
}
