import { Component, type ErrorInfo, type ReactNode } from 'react'
import { emit } from '../api/telemetry'
import './ErrorBoundary.css'

/**
 * Error boundaries still require a class component in React 19.
 *
 * Used twice over: once at the root, and once around each widget that can
 * plausibly throw on its own. A crash inside the map should cost the map, not
 * the pricing table three sections below it.
 */

interface Props {
  children: ReactNode
  /** shown instead of the subtree; omit for the full-page treatment */
  label?: string
  variant?: 'page' | 'inline' | 'widget'
}

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    emit({
      name: 'ui_crash',
      code: error.name,
      detail: {
        message: error.message,
        boundary: this.props.label ?? 'root',
        componentStack: info.componentStack,
      },
    })
  }

  private readonly reset = () => {
    this.setState({ failed: false })
  }

  private readonly reload = () => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children

    // a fixed widget cannot fall back to a block in the document flow
    if (this.props.variant === 'widget') {
      return (
        <div className="boundary boundary-widget" role="alert">
          <span className="boundary-widget-text">Chat is unavailable.</span>
          <button className="boundary-widget-retry" type="button" onClick={this.reset}>
            Retry
          </button>
        </div>
      )
    }

    if (this.props.variant === 'inline') {
      return (
        <div className="boundary boundary-inline" role="alert">
          <p className="boundary-text">
            {this.props.label
              ? `The ${this.props.label} could not be displayed.`
              : 'This part could not be displayed.'}{' '}
            The rest of the page still works.
          </p>
          <button className="pill pill-outline" type="button" onClick={this.reset}>
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="boundary boundary-page" role="alert">
        <div className="boundary-inner">
          <p className="boundary-kicker">Something broke</p>
          <h1 className="boundary-title">This page did not load.</h1>
          <p className="boundary-text">
            Nothing you did caused it. Reload, and if it happens again, write to us and we
            will look at it.
          </p>
          <button className="pill pill-outline" type="button" onClick={this.reload}>
            Reload the page
          </button>
        </div>
      </div>
    )
  }
}
