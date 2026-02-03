import { AttributesManager } from 'ask-sdk-core';

export interface IStorageDependencies {
  attributesManager: AttributesManager;
}

export interface IStorage {
  loadAttributes(): Promise<Record<string, unknown>>;
  saveAttributes(): Promise<void>;
}
