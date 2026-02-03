import { RequestEnvelope } from 'ask-sdk-model';
import { ResponseBuilder } from 'ask-sdk-core';
import { IAudioState } from './IAudioState';

export interface IBucketDependencies {
  requestEnvelope: RequestEnvelope;
  responseBuilder: ResponseBuilder;
}

export interface IBucket {
  uploadFromStream(audioState: IAudioState, streamFile: string): Promise<void>;
}

export interface IBucketConfig {
  s3Bucket: string;
  s3Expires: number;
}
