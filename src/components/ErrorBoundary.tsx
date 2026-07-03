import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    try { indexedDB.deleteDatabase('cctc-app'); } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
          <div className="max-w-md text-center space-y-4" role="alert" aria-live="assertive">
            <h1 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Something went wrong
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button variant="secondary" onClick={this.handleReset}>Reset local data</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
