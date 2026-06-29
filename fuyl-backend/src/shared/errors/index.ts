export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'APP_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: { code: this.code, message: this.message, details: this.details },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, message, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, message, 'CONFLICT', details);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required') {
    super(402, message, 'PAYMENT_REQUIRED');
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', details?: unknown) {
    super(422, message, 'UNPROCESSABLE_ENTITY', details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Something went wrong') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
  }
}

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
  SUBSCRIPTION_NOT_OWNED: 'SUBSCRIPTION_NOT_OWNED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFERRAL_CODE_INVALID: 'REFERRAL_CODE_INVALID',
  REFERRAL_CODE_EXPIRED: 'REFERRAL_CODE_EXPIRED',
  REFERRAL_SELF_REFER: 'REFERRAL_SELF_REFER',
  REFERRAL_FRAUD_DETECTED: 'REFERRAL_FRAUD_DETECTED',
  REFERRAL_ALREADY_APPLIED: 'REFERRAL_ALREADY_APPLIED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
