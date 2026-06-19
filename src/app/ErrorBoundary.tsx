import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Root error boundary: catches render-time exceptions anywhere in the tree and
 * shows a recoverable fallback instead of a blank white screen. Data-fetch
 * errors are handled separately by FatalState inside the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Minimal client-side logging hook — replace with a real sink (Sentry, etc.) later.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h1>Something broke on screen</h1>
          <p>An unexpected error interrupted the board. Your data is safe — try again.</p>
          {error.message ? <pre className="error-boundary-detail">{error.message}</pre> : null}
          <div className="error-boundary-actions">
            <button className="primary-button" type="button" onClick={this.handleReload}>
              Reload app
            </button>
            <button className="ghost-button" type="button" onClick={this.handleReset}>
              Try to recover
            </button>
          </div>
        </div>
      </div>
    );
  }
}
