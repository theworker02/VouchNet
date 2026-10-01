'use client';

import { useEffect } from 'react';
import { reportClientError } from '../../lib/telemetry';

export function ClientErrorCapture() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      reportClientError({
        errorMessage: event.message || 'Uncaught browser error',
        errorName: event.error instanceof Error ? event.error.name : 'WindowError',
        route: window.location.pathname,
        severity: 'HIGH',
        stackTrace: event.error instanceof Error ? event.error.stack : undefined,
      });
    }
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const error = event.reason instanceof Error ? event.reason : null;
      reportClientError({
        errorMessage: error?.message ?? String(event.reason ?? 'Unhandled rejection'),
        errorName: error?.name ?? 'UnhandledRejection',
        route: window.location.pathname,
        severity: 'HIGH',
        stackTrace: error?.stack,
      });
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
  return null;
}
