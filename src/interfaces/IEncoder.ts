import { RequestEnvelope } from 'ask-sdk-model';
import { ResponseBuilder } from 'ask-sdk-core';
import { IAudioState } from './IAudioState';

export interface IEncoderDependencies {
  requestEnvelope: RequestEnvelope;
  responseBuilder: ResponseBuilder;
}

export interface IEncoder {
  executeEncode(audioState: IAudioState): Promise<void>;
}
