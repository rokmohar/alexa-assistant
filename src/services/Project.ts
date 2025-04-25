import axios from 'axios';
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

  registerModel<T>(callback: (err: Error | null, data: T | null) => void): void {
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
      device_type: 'action.devices.types.LIGHT',
      traits: ['action.devices.traits.OnOff'],
    };

    this.logger.info('Starting register model');

    axios({
      url: registrationModelURL,
      method: 'POST',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json',
      },
      data: deviceModel,
      responseType: 'json',
    })
      .then((response) => {
        this.logger.info('Register model complete', { data: response.data });
        callback(null, response.data);
      })
      .catch((error) => {
        this.logger.error('Register model error', { error });

        if (error.response?.status === 409) {
          this.logger.warn('Model already exists');
          callback(null, error.response.data);
        } else {
          const externalError = new ExternalError('Failed to register model with Google API', { originalError: error });
          this.errorHandler.handleError(externalError);
          callback(externalError, null);
        }
      });
  }

  registerInstance<T>(callback: (err: Error | null, data: T | null) => void): void {
    const registrationInstanceURL = `https://${this.config.googleApiEndpoint}/v1alpha2/projects/${this.config.googleProjectId}/devices/`;
    const bearer = `Bearer ${this.requestEnvelope.context.System.user.accessToken}`;
    const instanceModel: IInstanceModel = {
      id: this.config.googleProjectId,
      model_id: this.config.googleProjectId,
      nickname: 'Alexa Assistant v1',
      clientType: 'SDK_SERVICE',
    };

    this.logger.info('Starting register instance');

    axios({
      url: registrationInstanceURL,
      method: 'POST',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json',
      },
      data: instanceModel,
      responseType: 'json',
    })
      .then((response) => {
        this.logger.info('Register instance complete', { data: response.data });
        callback(null, response.data);
      })
      .catch((error) => {
        this.logger.error('Register instance error', { error });

        if (error.response?.status === 409) {
          this.logger.warn('Instance already exists');
          callback(null, error.response.data);
        } else {
          const externalError = new ExternalError('Failed to register instance with Google API', { originalError: error });
          this.errorHandler.handleError(externalError);
          callback(externalError, null);
        }
      });
  }

  async registerProject(): Promise<void> {
    this.logger.info('Project registration started');

    return new Promise<void>((resolve, reject) => {
      this.storage.loadAttributes((err, dbAttributes) => {
        if (err) {
          this.logger.error('Get attributes error', { error: err });
          const internalError = new InternalError('Failed to load attributes', { originalError: err });
          this.errorHandler.handleError(internalError);
          return reject(internalError);
        }

        if (dbAttributes) {
          this.logger.info('Got positive attributes response', { attributes: dbAttributes });

          if (dbAttributes['registered']) {
            this.logger.warn('Project is already registered');
            return resolve();
          }

          this.registerModel((err, model) => {
            if (err) {
              this.logger.error('Got register model error', { error: err });
              return reject(err);
            }

            if (model) {
              this.logger.info('Got positive model response', { model });

              this.registerInstance((err) => {
                if (err) {
                  this.logger.error('Got register instance error', { error: err });
                  return reject(err);
                }

                this.logger.info('Got positive Instance response');

                const attributes = this.attributesManager.getRequestAttributes();
                attributes['microphone_open'] = false;

                dbAttributes['registered'] = true;

                this.storage.saveAttributes((err) => {
                  if (err) {
                    this.logger.error('Got save attributes error', { error: err });
                    const internalError = new InternalError('Failed to save attributes', { originalError: err });
                    this.errorHandler.handleError(internalError);
                    return reject(internalError);
                  }

                  this.logger.info('Save attributes complete');
                  return resolve();
                });
              });
            }
          });
        }
      });
    });
  }
}

export default Project;
