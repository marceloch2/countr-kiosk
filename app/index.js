import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'

import Root from './containers/Root'
import { configureStore, history } from './store/configureStore'

import ErrorBoundary from './ErrorBoundary'

import './app.global.css'

import { MerchantContext, state } from './context'

const store = configureStore()
render(
  <AppContainer>
    <MerchantContext.Provider value={state}>
      <ErrorBoundary>
        <I18nextProvider i18n={i18n}>
          <Root store={store} history={history} />
        </I18nextProvider>
      </ErrorBoundary>
    </MerchantContext.Provider>
  </AppContainer>,
  document.getElementById('root')
)

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    const NextRoot = require('./containers/Root') // eslint-disable-line global-require
    render(
      <AppContainer>
        <MerchantContext.Provider value={state}>
          <ErrorBoundary>
            <I18nextProvider i18n={i18n}>
              <NextRoot store={store} history={history} />
            </I18nextProvider>
          </ErrorBoundary>
        </MerchantContext.Provider>
      </AppContainer>,
      document.getElementById('root')
    )
  })
}
