import { AppError } from '../errors/AppError';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error | AppError;
}

export class Logger {
  private static instance: Logger;
  private currentLogLevel: LogLevel;
  private readonly logLevels: Record<LogLevel, number> = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3,
    [LogLevel.TRACE]: 4,
  };

  private constructor() {
    this.currentLogLevel = this.getLogLevelFromEnv();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    return Object.values(LogLevel).includes(envLogLevel as LogLevel) ? (envLogLevel as LogLevel) : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.logLevels[this.currentLogLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? `\nError: ${entry.error.message}\n${entry.error.stack}` : '';

    return `[${timestamp}] ${entry.level}: ${entry.message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error | AppError): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };

    const formattedLog = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.TRACE:
        console.trace(formattedLog);
        break;
    }
  }

  public error(message: string, context?: Record<string, any>, error?: Error | AppError): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }
}
