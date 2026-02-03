import { AttributesManager, ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { IAudioState } from './IAudioState';
import { ILocation } from './ILocation';

export interface IAssistant {
  executeAssist(audioState: IAudioState): Promise<void>;
}

export interface IAssistantDependencies {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
  responseBuilder: ResponseBuilder;
  locationService: ILocation;
}

export interface IAssistantConfig {
  googleApiEndpoint: string;
  googleProjectId: string;
  supportedLocales: string[];
  audioTimeout: number;
}
