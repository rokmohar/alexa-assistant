import { z } from 'zod';
import { Logger } from '../services/Logger';
import { InternalError } from '../errors/AppError';

const ConfigSchema = z.object({
  // Google API Configuration
  GOOGLE_API_ENDPOINT: z.string().min(1, 'Google API endpoint is required'),
  GOOGLE_PROJECT_ID: z.string().min(1, 'Google Project ID is required'),

  // AWS Configuration
  S3_BUCKET: z.string().min(1, 'S3 bucket is required'),
  S3_EXPIRES: z.number().int().positive().default(10),
  DYNAMODB_TABLE_NAME: z.string().default('AlexaAssistantSkillSettings'),

  // Audio Configuration
  AUDIO_TIMEOUT: z.number().int().positive().default(9000),

  // Device Configuration
  DEVICE_TYPE: z.string().default('action.devices.types.SPEAKER'),

  // Locale Configuration (comma-separated list)
  SUPPORTED_LOCALES: z
    .string()
    .default('en-US,en-GB,de-DE,en-AU,en-CA,en-IN,ja-JP')
    .transform((val) => val.split(',')),

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

  public get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  public getAll(): Config {
    return { ...this.config };
  }
}
