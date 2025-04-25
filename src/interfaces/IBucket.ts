import { RequestEnvelope } from 'ask-sdk-model';
import { ResponseBuilder } from 'ask-sdk-core';
import { AudioState } from '../models/AudioState';

export interface IBucketDependencies {
  requestEnvelope: RequestEnvelope;
  responseBuilder: ResponseBuilder;
}

export interface IBucket {
  uploadFromStream(audioState: AudioState, streamFile: string): Promise<void>;
}

export interface IBucketConfig {
  s3Bucket: string;
}
