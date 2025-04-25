export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL = 'EXTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
}

export enum ErrorCode {
  // Validation Errors (1000-1999)
  INVALID_INPUT = 1000,
  MISSING_REQUIRED_FIELD = 1001,
  INVALID_FORMAT = 1002,

  // Authentication Errors (2000-2999)
  INVALID_TOKEN = 2000,
  TOKEN_EXPIRED = 2001,
  INVALID_CREDENTIALS = 2002,

  // Authorization Errors (3000-3999)
  INSUFFICIENT_PERMISSIONS = 3000,
  ACCESS_DENIED = 3001,

  // Not Found Errors (4000-4999)
  RESOURCE_NOT_FOUND = 4000,
  USER_NOT_FOUND = 4001,

  // Conflict Errors (5000-5999)
  RESOURCE_ALREADY_EXISTS = 5000,
  DUPLICATE_ENTRY = 5001,

  // Internal Errors (6000-6999)
  INTERNAL_SERVER_ERROR = 6000,
  DATABASE_ERROR = 6001,
  FILE_SYSTEM_ERROR = 6002,

  // External Errors (7000-7999)
  EXTERNAL_API_ERROR = 7000,
  NETWORK_ERROR = 7001,

  // Timeout Errors (8000-8999)
  REQUEST_TIMEOUT = 8000,
  OPERATION_TIMEOUT = 8001,
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(message: string, type: ErrorType, code: ErrorCode, details?: any) {
    super(message);
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      message: this.message,
      type: this.type,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.AUTHENTICATION, ErrorCode.INVALID_TOKEN, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.AUTHORIZATION, ErrorCode.INSUFFICIENT_PERMISSIONS, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, ErrorCode.RESOURCE_ALREADY_EXISTS, details);
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.INTERNAL, ErrorCode.INTERNAL_SERVER_ERROR, details);
  }
}

export class ExternalError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.EXTERNAL, ErrorCode.EXTERNAL_API_ERROR, details);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.TIMEOUT, ErrorCode.REQUEST_TIMEOUT, details);
  }
}
