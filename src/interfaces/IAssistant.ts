import { AttributesManager, ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { AudioState } from '../models/AudioState';

export interface IAssistant {
  executeAssist(audioState: AudioState): Promise<void>;
}

export interface IAssistantDependencies {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
  responseBuilder: ResponseBuilder;
}

export interface IAssistantConfig {
  googleApiEndpoint: string;
  googleProjectId: string;
  deviceLocation: string[];
  supportedLocales: string[];
}
