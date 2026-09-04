export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const errors = {
  validation: (message: string) => new AppError('VALIDATION_ERROR', message, 400),
  unauthorized: (message = 'Authentication required.') => new AppError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'You do not have permission to perform this action.') => new AppError('FORBIDDEN', message, 403),
  notFound: (message = 'Resource not found.') => new AppError('NOT_FOUND', message, 404),
  conflict: (code: string, message: string) => new AppError(code, message, 409),
  insufficientStock: (message: string) => new AppError('INSUFFICIENT_STOCK', message, 409),
  invalidTransition: (message: string) => new AppError('INVALID_ORDER_TRANSITION', message, 409),
  paymentFailed: (message: string) => new AppError('PAYMENT_FAILED', message, 402),
  unavailable: (code: string, message: string) => new AppError(code, message, 503),
  ledgerUnbalanced: (message: string) => new AppError('LEDGER_UNBALANCED', message, 500),
  internal: (message = 'Unexpected server error.') => new AppError('INTERNAL_ERROR', message, 500),
};

export function sendError(res: any, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  });
}
