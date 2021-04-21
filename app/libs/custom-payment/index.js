export default class CustomPayment {
  constructor(countr, ws, payload, createErrorLog) {
    this.countr = countr
    this.ws = ws
    this.method = payload.method
    this.extras = payload.extras
    this.amount = payload.amount
    this.reference = payload.reference
    this.currency = payload.currency
    this.device_id = payload.device_id
    this.checkoutId = payload.checkoutId
    this.paymentId = payload.paymentId || null
    this.paymentProcess = {}
    this.result = null
    this.errorLog = createErrorLog
  }

  sendData(payload) {
    this.ws.send(JSON.stringify(payload))
  }

  initPayment() {
    this.countr
      .checkPaymentProviderStatus(this.method, this.extras)
      .then((checkResponse) => {
        if (checkResponse.message) {
          this.sendData({
            event: 'message',
            payload: checkResponse,
          })
        }

        if (!checkResponse.warning && !checkResponse.success) {
          this.sendData({
            event: 'handleResult',
            payload: checkResponse,
          })
        } else if (checkResponse.warning) {
          this.sendData({
            event: 'continueWithPayment',
            payload: checkResponse,
          })
        } else if (checkResponse.success) {
          this.startPayment()
        }
      })
      .catch((error) => {
        this.sendData({
          event: 'handleError',
          payload: error,
        })
      })
  }

  startPayment() {
    console.log('### Attempting ' + this.method + ' payment')
    const args = {
      reference: this.reference,
      amount: this.amount,
      currency: this.currency,
      device_id: this.device_id,
      checkoutId: this.checkoutId,
      ...this.extras,
    }

    if (args.amount < 0) {
      args.paymentId = this.paymentId
    }

    this.countr
      .runPayment(
        this.method,
        args,
        (startInfo) => {
          console.log('PAYMENT STARTED', JSON.stringify(startInfo))
          const msg = 'transaction_started' + ' ' + (startInfo || {}).paymentId
          this.sendData({
            event: 'paymentStarted',
            payload: {
              message: msg,
              extra: startInfo,
            },
          })

          if (startInfo && startInfo.paymentId) {
            this.paymentProcess.paymentId = startInfo.paymentId
          }
        },
        (message) => {
          //Don't display messages if in process of cancelling
          // Or if message is undefined
          if (!message || this.paymentProcess.cancelling) {
            return
          }
          console.log('MESSAGE RECEIVED', message)

          if (message.indexOf('@INSERTED_AMOUNT') === 0) {
            const insertedAmount =
              parseFloat(message.replace('@INSERTED_AMOUNT ', '')) / 100
            console.log('### Inserted: ' + insertedAmount)
            this.sendData({
              event: 'messageReceived',
              payload: {
                total_paid_value: insertedAmount,
                remaining_value: this.amount / 100 - insertedAmount,
              },
            })
          } else if (message.indexOf('@INSERTED_DETAILS') === 0) {
            console.log(message.replace('@INSERTED_DETAILS ', ''))
          } else {
            this.sendData({
              event: 'messageReceived',
              payload: { message: message },
            })
          }
        }
      )
      .then((finalResponse) => {
        console.log('##### Finished')
        this.handleResult(finalResponse)
      })
      .catch((error) => {
        console.log('##### ERROR ON PAY')
        this.handleResult(error)
      })
  }

  handleResult(_result) {
    // define temp variables
    let _status = null
    let _message = ''

    this.result = _result || {}

    console.log('### RESULT: ' + JSON.stringify(_result))

    // validate transaction result
    if (_result.success) {
      //Full normal success
      _status = 'success'
      _message = 'payment_success'

      this.paymentProcess.success = true
      this.paymentProcess.info = _result

      console.log('### Closing')
      this.sendData({
        event: 'handleResult',
        payload: _result,
      })
      // close()
    } else if (_result.warning) {
      _status = 'success'
      _message = _result.message || 'payment_success'

      this.paymentProcess.success = true
      this.paymentProcess.info = _result

      console.log('### Closing')
      this.sendData({
        event: 'handleResult',
        payload: _result,
      })
      // close()
      // alert(_result.message)
    } else {
      _status = this.paymentProcess.cancelling ? 'warning' : 'error'

      var message_appendix =
        _result.message ||
        (_result.response || {}).errorMessage ||
        (_result.response || {}).resultCode ||
        (_result.response || {}).reason
      var status_appendix = message_appendix ? ': ' + message_appendix : ''
      _message = this.paymentProcess.cancelling
        ? 'transaction_cancelled'
        : 'payment_error' + status_appendix

      console.log('### Display message: ' + _message.title)

      const err = {
        info: {
          returnedData: JSON.stringify(_result),
          provider: this.method,
          reference: this.reference,
        },
      }
      this.errorLog(err, 'Payment failed')

      this.paymentProcess.cancelled = true
      this.sendData({
        event: 'handleResult',
        payload: _result,
      })
    }
  }

  handleCancel() {
    this.countr
      .cancelPayment(
        this.method,
        { paymentId: this.paymentProcess.paymentId, ...this.extras },
        function (message) {
          console.log('CANCEL MESSAGE RECEIVED', JSON.stringify(message))
          this.sendData({
            event: 'messageReceived',
            payload: { message: JSON.stringify(message) },
          })
        }
      )
      .then((finalResponse) => {
        console.log('Finished cancel')
        this.paymentProcess.cancelling = true
      })
      .catch((err) => {
        console.log('ERROR ON CANCEL')
        console.log(err.message)
        this.handleResult(err.message)
      })
  }
}
