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

const duplicateWindowMilliseconds = 30_000;
const maxRecentFingerprints = 100;
const recentFingerprints = new Map<string, number>();

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

/**
 * A rendering fault can trigger both `error` and `unhandledrejection`, or repeat while a broken
 * view is mounted. Bound duplicate reports so diagnostics remain useful without becoming a client
 * error amplification path.
 */
export function shouldReportClientError(event: ClientErrorEvent, now = Date.now()): boolean {
  const fingerprint = `${event.errorName}:${event.route}:${event.errorMessage.slice(0, 256)}`;
  const previous = recentFingerprints.get(fingerprint);
  if (previous !== undefined && now - previous < duplicateWindowMilliseconds) return false;

  recentFingerprints.set(fingerprint, now);
  if (recentFingerprints.size > maxRecentFingerprints) {
    const oldest = recentFingerprints.keys().next().value;
    if (oldest !== undefined) recentFingerprints.delete(oldest);
  }
  return true;
}

export function reportClientError(event: ClientErrorEvent): void {
  const normalized = normalizeClientError(event);
  if (!shouldReportClientError(normalized)) return;
  const payload = JSON.stringify(normalized);
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
