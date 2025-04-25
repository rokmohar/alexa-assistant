import { RequestEnvelope } from 'ask-sdk-model';
import { AttributesManager } from 'ask-sdk-core';

export interface IProjectDependencies {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
}

export interface IProject {
  registerProject(): Promise<void>;
  registerModel<T>(callback: (err: Error | null, data: T | null) => void): void;
  registerInstance<T>(callback: (err: Error | null, data: T | null) => void): void;
}

export interface IProjectConfig {
  googleApiEndpoint: string;
  googleProjectId: string;
}
