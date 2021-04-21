import React from 'react'

export default class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidCatch(error, info) {
    // @TODO SEND TO MONOLITH
    console.log(error, info)
  }

  render() {
    const { hasError } = this.state
    const { children } = this.props
    if (hasError) {
      return (
        <h1>
          Sorry something went wrong, we will be looking to this error, you can find support using
          Intercom
        </h1>
      )
    }

    return children
  }
}
