import { z } from 'zod';

export const ConfigSchema = z.object({
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

  // Logging Configuration
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).default('INFO'),
});

export type Config = z.infer<typeof ConfigSchema>;
