import { AttributesManager } from 'ask-sdk-core';

export interface IStorageDependencies {
  attributesManager: AttributesManager;
}

export interface IStorage {
  loadAttributes(callback: (error: Error | null, attributes: Record<string, any> | null) => void): Promise<void>;
  saveAttributes(callback: (error: Error | null) => void): Promise<void>;
}
