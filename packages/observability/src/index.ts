export interface LogContext {
  requestId?: string;
  operation: string;
  outcome?: 'success' | 'failure';
  errorCode?: string;
}
export interface Logger {
  info(context: LogContext): void;
  error(context: LogContext): void;
}

function sanitize(context: LogContext): LogContext {
  // Deliberately whitelist fields so credentials and request bodies cannot enter logs by accident.
  return {
    operation: context.operation,
    ...(context.requestId === undefined ? {} : { requestId: context.requestId }),
    ...(context.outcome === undefined ? {} : { outcome: context.outcome }),
    ...(context.errorCode === undefined ? {} : { errorCode: context.errorCode }),
  };
}

export const logger: Logger = {
  info(context) {
    console.info(JSON.stringify({ level: 'info', ...sanitize(context) }));
  },
  error(context) {
    console.error(JSON.stringify({ level: 'error', ...sanitize(context) }));
  },
};
