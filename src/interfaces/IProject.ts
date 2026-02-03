import { RequestEnvelope } from 'ask-sdk-model';
import { AttributesManager } from 'ask-sdk-core';

export interface IProjectDependencies {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
}

export interface IProject {
  registerProject(): Promise<void>;
  registerModel<T>(): Promise<T>;
  registerInstance<T>(): Promise<T>;
}

export interface IProjectConfig {
  googleApiEndpoint: string;
  googleProjectId: string;
  deviceType: string;
}
