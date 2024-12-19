/**
 * ErrorBoundary Component
 * 
 * Catches and handles errors in child components to prevent
 * the entire app from crashing.
 * 
 * @component
 */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // TODO: Send error to logging service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container text-center py-5">
          <h2 className="text-danger mb-4">Something went wrong</h2>
          <p className="text-muted mb-4">
            We apologize for the inconvenience. Please try refreshing the page.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
} 