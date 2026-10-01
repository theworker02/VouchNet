'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportClientError } from '../../lib/telemetry';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches client-rendering failures below the application shell. Server-render failures remain
 * handled by App Router error files, which avoid exposing exception details to members. */
export class ComponentDiagnosticBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      componentStack: info.componentStack ?? undefined,
      errorMessage: error.message,
      errorName: error.name,
      route: window.location.pathname,
      severity: 'HIGH',
      stackTrace: error.stack,
    });
  }

  reload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <section className="component-recovery" aria-live="assertive">
        <AlertTriangle aria-hidden="true" />
        <div>
          <p className="eyebrow">Component diagnostic recovery</p>
          <h1>This view needs to reload.</h1>
          <p>
            The diagnostic was queued for VouchNet operators. Your existing account data is safe.
          </p>
          <button className="primary" onClick={this.reload} type="button">
            <RefreshCw aria-hidden="true" size={16} /> Report &amp; reload
          </button>
        </div>
      </section>
    );
  }
}
