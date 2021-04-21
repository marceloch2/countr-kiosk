import React from 'react'
import { Switch, Route, withRouter } from 'react-router'
import routes from './constants/routes'
import App from './containers/App'

import LoginPage from './containers/LoginPage'
import MainPage from './containers/MainPage'
import LoggedPage from './containers/LoggedPage'

export default withRouter(() => (
  <App>
    <Switch>
      <Route
        exact
        path="/"
        render={({ history }) => <LoginPage history={history} />}
      />
      <Route
        path="/main"
        render={({ history }) => <MainPage history={history} />}
      />
      <Route
        path="/logged"
        render={({ history }) => <LoggedPage history={history} />}
      />
    </Switch>
  </App>
))
