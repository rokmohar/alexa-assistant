import { z } from 'zod';
import { Logger } from '../services/Logger';
import { InternalError } from '../errors/AppError';

const ConfigSchema = z.object({
  // Google API Configuration
  GOOGLE_API_ENDPOINT: z.string().min(1, 'Google API endpoint is required'),
  GOOGLE_PROJECT_ID: z.string().min(1, 'Google Project ID is required'),
  DEVICE_LOCATION: z.string().transform((val: string) => val.split(',')),

  // AWS Configuration
  S3_BUCKET: z.string().min(1, 'S3 bucket is required'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).default('INFO'),
});

export type Config = z.infer<typeof ConfigSchema>;

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

  private validateConfig(config: Record<string, unknown>): Config {
    try {
      return ConfigSchema.parse(config);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors.filter((err: z.ZodIssue) => err.code === 'invalid_type' && err.received === 'undefined').map((err: z.ZodIssue) => err.path.join('.'));

        if (missingVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
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

  public get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  public getAll(): Config {
    return { ...this.config };
  }
}
