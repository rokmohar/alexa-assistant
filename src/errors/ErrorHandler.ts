import { AppError, ErrorType } from './AppError';
import { Logger } from '../services/Logger';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error | AppError): void {
    if (error instanceof AppError) {
      this.handleAppError(error);
    } else {
      this.handleUnknownError(error);
    }
  }

  private handleAppError(error: AppError): void {
    const context = {
      type: error.type,
      code: error.code,
      details: error.details,
    };

    switch (error.type) {
      case ErrorType.VALIDATION:
        this.logger.error('Validation error occurred', context, error);
        break;
      case ErrorType.AUTHENTICATION:
        this.logger.error('Authentication error occurred', context, error);
        break;
      case ErrorType.AUTHORIZATION:
        this.logger.error('Authorization error occurred', context, error);
        break;
      case ErrorType.NOT_FOUND:
        this.logger.error('Resource not found', context);
        break;
      case ErrorType.CONFLICT:
        this.logger.error('Resource conflict occurred', context);
        break;
      case ErrorType.INTERNAL:
        this.logger.error('Internal error occurred', context, error);
        break;
      case ErrorType.EXTERNAL:
        this.logger.error('External service error occurred', context, error);
        break;
      case ErrorType.TIMEOUT:
        this.logger.error('Timeout error occurred', context, error);
        break;
      default:
        this.logger.error('Unknown app error occurred', context, error);
    }
  }

  private handleUnknownError(error: Error): void {
    this.logger.error('Unknown error occurred', { stack: error.stack }, error);
  }

  public isOperationalError(error: Error | AppError): boolean {
    if (error instanceof AppError) {
      return [ErrorType.VALIDATION, ErrorType.AUTHENTICATION, ErrorType.AUTHORIZATION, ErrorType.NOT_FOUND, ErrorType.CONFLICT, ErrorType.TIMEOUT].includes(error.type);
    }
    return false;
  }
}
