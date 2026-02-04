import { z } from 'zod';
import { Logger } from '../services/Logger';
import { InternalError } from '../errors/AppError';
import { Config, ConfigSchema } from './Config';

export class ConfigService {
  private static instance: ConfigService;

  private readonly config: Config;
  private readonly logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  public getAll(): Config {
    return { ...this.config };
  }

  private validateConfig(config: Record<string, unknown>): Config {
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const invalidVars = error.issues.map((err) => err.path.join('.'));

        if (invalidVars.length > 0) {
          throw new Error(`Invalid environment variables: ${invalidVars.join(', ')}`);
        }
      }
      throw error;
    }
  }

  private loadConfig(): Config {
    try {
      const config = this.validateConfig(process.env);
      this.logger.info('Configuration loaded successfully');
      return config;
    } catch (error) {
      this.logger.error('Failed to load configuration', { error });
      throw new InternalError('Failed to load configuration', { originalError: error });
    }
  }
}
