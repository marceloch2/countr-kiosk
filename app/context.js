import React from 'react'

export const state = {
  logged: false,
  remember: false,
  merchant: {},
  updateMerchant(merchant) {
    if (Object.keys(merchant).length) {
      this.logged = true
      this.merchant = merchant
    }
  },
  updateRememberPassword(remember) {
    this.remember = remember
  }
}

export const MerchantContext = React.createContext(state)
