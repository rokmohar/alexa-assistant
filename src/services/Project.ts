import axios, { AxiosError } from 'axios';
import { AttributesManager } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { IProject, IProjectConfig, IProjectDependencies } from '../interfaces/IProject';
import { IStorage } from '../interfaces/IStorage';
import { Logger } from './Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { ExternalError, InternalError } from '../errors/AppError';
import { ServiceFactory } from '../factories/ServiceFactory';
import { IDeviceModel } from '../interfaces/IDeviceModel';
import { IInstanceModel } from '../interfaces/IInstanceModel';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

class Project implements IProject {
  private readonly requestEnvelope: RequestEnvelope;
  private readonly attributesManager: AttributesManager;
  private readonly config: IProjectConfig;
  private readonly storage: IStorage;
  private readonly logger: Logger;
  private readonly errorHandler: ErrorHandler;

  constructor(dependencies: IProjectDependencies, config: IProjectConfig) {
    this.requestEnvelope = dependencies.requestEnvelope;
    this.attributesManager = dependencies.attributesManager;
    this.config = config;
    this.storage = ServiceFactory.getInstance().createStorage({
      attributesManager: this.attributesManager,
    });
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors (except 429 rate limiting)
        if (error instanceof AxiosError && error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, { attempt, maxRetries: MAX_RETRIES, error: lastError.message });
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError;
  }

  async registerModel<T>(): Promise<T> {
    const registrationModelURL = `https://${this.config.googleApiEndpoint}/v1alpha2/projects/${this.config.googleProjectId}/deviceModels/`;
    const bearer = `Bearer ${this.requestEnvelope.context.System.user.accessToken}`;
    const deviceModel: IDeviceModel = {
      project_id: this.config.googleProjectId,
      device_model_id: this.config.googleProjectId,
      manifest: {
        manufacturer: 'Assistant SDK developer',
        product_name: 'Alexa Assistant v1',
        device_description: 'Alexa Assistant Skill v1',
      },
      device_type: this.config.deviceType,
      traits: ['action.devices.traits.OnOff'],
    };

    this.logger.info('Starting register model');

    return this.withRetry(async () => {
      try {
        const response = await axios({
          url: registrationModelURL,
          method: 'POST',
          headers: {
            Authorization: bearer,
            'Content-Type': 'application/json',
          },
          data: deviceModel,
          responseType: 'json',
        });

        this.logger.info('Register model complete', { data: response.data });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 409) {
          this.logger.warn('Model already exists');
          return error.response.data;
        }

        this.logger.error('Register model error', { error });
        const externalError = new ExternalError('Failed to register model with Google API', { originalError: error });
        this.errorHandler.handleError(externalError);
        throw externalError;
      }
    }, 'registerModel');
  }

  async registerInstance<T>(): Promise<T> {
    const registrationInstanceURL = `https://${this.config.googleApiEndpoint}/v1alpha2/projects/${this.config.googleProjectId}/devices/`;
    const bearer = `Bearer ${this.requestEnvelope.context.System.user.accessToken}`;
    const instanceModel: IInstanceModel = {
      id: this.config.googleProjectId,
      model_id: this.config.googleProjectId,
      nickname: 'Alexa Assistant v1',
      clientType: 'SDK_SERVICE',
    };

    this.logger.info('Starting register instance');

    return this.withRetry(async () => {
      try {
        const response = await axios({
          url: registrationInstanceURL,
          method: 'POST',
          headers: {
            Authorization: bearer,
            'Content-Type': 'application/json',
          },
          data: instanceModel,
          responseType: 'json',
        });

        this.logger.info('Register instance complete', { data: response.data });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 409) {
          this.logger.warn('Instance already exists');
          return error.response.data;
        }

        this.logger.error('Register instance error', { error });
        const externalError = new ExternalError('Failed to register instance with Google API', { originalError: error });
        this.errorHandler.handleError(externalError);
        throw externalError;
      }
    }, 'registerInstance');
  }

  async registerProject(): Promise<void> {
    this.logger.info('Project registration started');

    let dbAttributes: Record<string, unknown>;

    try {
      dbAttributes = await this.storage.loadAttributes();
    } catch (err) {
      this.logger.error('Get attributes error', { error: err });
      const internalError = new InternalError('Failed to load attributes', { originalError: err });
      this.errorHandler.handleError(internalError);
      throw internalError;
    }

    this.logger.info('Got positive attributes response', { attributes: dbAttributes });

    if (dbAttributes['registered']) {
      this.logger.warn('Project is already registered');
      return;
    }

    const model = await this.registerModel();
    this.logger.info('Got positive model response', { model });

    await this.registerInstance();
    this.logger.info('Got positive instance response');

    const attributes = this.attributesManager.getRequestAttributes();
    attributes['microphone_open'] = false;
    dbAttributes['registered'] = true;

    try {
      await this.storage.saveAttributes();
      this.logger.info('Save attributes complete');
    } catch (err) {
      this.logger.error('Got save attributes error', { error: err });
      const internalError = new InternalError('Failed to save attributes', { originalError: err });
      this.errorHandler.handleError(internalError);
      throw internalError;
    }
  }
}

export default Project;
