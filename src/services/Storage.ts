import { AttributesManager } from 'ask-sdk-core';
import { IStorage, IStorageDependencies } from '../interfaces/IStorage';
import { Logger } from './Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { InternalError } from '../errors/AppError';

class Storage implements IStorage {
  private readonly attributesManager: AttributesManager;
  private readonly logger: Logger;
  private readonly errorHandler: ErrorHandler;

  constructor(dependencies: IStorageDependencies) {
    this.attributesManager = dependencies.attributesManager;
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  async loadAttributes(callback: (error: Error | null, attributes: Record<string, any> | null) => void): Promise<void> {
    this.logger.info('Started load attributes');

    try {
      const attributes = await this.attributesManager.getPersistentAttributes();
      this.logger.info('Load attributes complete');
      callback(null, attributes);
    } catch (error) {
      this.logger.error('Got error with load attributes', { error });
      const internalError = new InternalError('Failed to load attributes', { originalError: error });
      this.errorHandler.handleError(internalError);
      callback(internalError, null);
    }
  }

  async saveAttributes(callback: (error: Error | null) => void): Promise<void> {
    this.logger.info('Started save attributes');

    try {
      await this.attributesManager.savePersistentAttributes();
      this.logger.info('Save attributes complete');
      callback(null);
    } catch (error) {
      this.logger.error('Got error with save attributes', { error });
      const internalError = new InternalError('Failed to save attributes', { originalError: error });
      this.errorHandler.handleError(internalError);
      callback(internalError);
    }
  }
}

export default Storage;
