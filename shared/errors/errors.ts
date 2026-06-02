export class BaseError extends Error {
  constructor(message: string, public readonly statusCode: number = 500) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, public readonly details?: any) {
    super(message, 400);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class GatewayError extends BaseError {
  constructor(message: string, public readonly correlationId?: string) {
    super(message, 502);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
  }
}
