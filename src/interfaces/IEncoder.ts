import { RequestEnvelope } from 'ask-sdk-model';
import { ResponseBuilder } from 'ask-sdk-core';
import { AudioState } from '../models/AudioState';

export interface IEncoderDependencies {
  requestEnvelope: RequestEnvelope;
  responseBuilder: ResponseBuilder;
}

export interface IEncoder {
  executeEncode(audioState: AudioState): Promise<void>;
}
