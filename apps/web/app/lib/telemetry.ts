'use client';

export type ClientErrorEvent = {
  componentStack?: string | undefined;
  errorMessage: string;
  errorName: string;
  route: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  stackTrace?: string | undefined;
};

const maxLengths = {
  componentStack: 8000,
  errorMessage: 4000,
  errorName: 160,
  route: 512,
  stackTrace: 12000,
} as const;

/** Browser errors can accidentally contain credentials in URLs or request headers. Retain only
 * diagnostic context and redact recognizable secret-bearing values before transport. */
function redact(value: string, limit: number): string {
  return value
    .replace(/(bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/(sk_(?:live|test)_[A-Za-z0-9_]+)/g, 'sk_[redacted]')
    .replace(/([?&](?:token|secret|password|code)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, limit);
}

export function normalizeClientError(input: ClientErrorEvent): ClientErrorEvent {
  return {
    componentStack:
      input.componentStack === undefined
        ? undefined
        : redact(input.componentStack, maxLengths.componentStack),
    errorMessage: redact(input.errorMessage || 'Unknown client error', maxLengths.errorMessage),
    errorName: redact(input.errorName || 'Error', maxLengths.errorName),
    route: redact(input.route.startsWith('/') ? input.route : '/', maxLengths.route),
    severity: input.severity,
    stackTrace:
      input.stackTrace === undefined ? undefined : redact(input.stackTrace, maxLengths.stackTrace),
  };
}

export function reportClientError(event: ClientErrorEvent): void {
  const payload = JSON.stringify(normalizeClientError(event));
  try {
    if (
      navigator.sendBeacon(
        '/api/telemetry/event',
        new Blob([payload], { type: 'application/json' }),
      )
    )
      return;
  } catch {
    // Fall through to a keepalive fetch; telemetry must never create a user-visible error.
  }
  void fetch('/api/telemetry/event', {
    body: payload,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined);
}
