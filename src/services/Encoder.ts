import { createReadStream, createWriteStream } from 'fs';
import { ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { IEncoder, IEncoderDependencies } from '../interfaces/IEncoder';
import { IBucket } from '../interfaces/IBucket';
import { Logger } from './Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { ExternalError, InternalError } from '../errors/AppError';
import { ServiceFactory } from '../factories/ServiceFactory';
import { IAudioState } from '../interfaces/IAudioState';
import { Mp3Encoder } from '@breezystack/lamejs';

class Encoder implements IEncoder {
  private readonly requestEnvelope: RequestEnvelope;
  private readonly responseBuilder: ResponseBuilder;
  private readonly bucket: IBucket;
  private readonly logger: Logger;
  private readonly errorHandler: ErrorHandler;

  constructor(dependencies: IEncoderDependencies) {
    this.requestEnvelope = dependencies.requestEnvelope;
    this.responseBuilder = dependencies.responseBuilder;
    this.bucket = ServiceFactory.getInstance().createBucket({
      requestEnvelope: this.requestEnvelope,
      responseBuilder: this.responseBuilder,
    });
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * This function takes the response from the API and re-encodes using our custom MP3 encoder.
   * There is lots of reading and writing from temp files which isn't ideal,
   * but I couldn't get piping to/from the encoder to work reliably in Lambda.
   */
  async executeEncode(audioState: IAudioState): Promise<void> {
    this.logger.info('Starting Transcode');

    const pcmFilepath = audioState.pcmFilePath ?? '/tmp/response.pcm';
    const mp3Filepath = pcmFilepath.replace(/\.pcm$/, '.mp3');

    return new Promise<void>((resolve, reject) => {
      const readPcm = createReadStream(pcmFilepath);

      readPcm.on('end', () => {
        this.logger.info('PCM stream read complete');
      });

      readPcm.on('error', (error) => {
        this.logger.error('Failed to read PCM stream', { error });
        const internalError = new InternalError('Failed to read PCM stream', { originalError: error });
        this.errorHandler.handleError(internalError);
        reject(internalError);
      });

      const writeMp3 = createWriteStream(mp3Filepath);

      writeMp3.on('finish', async () => {
        this.logger.info('MP3 has been written');

        try {
          await this.bucket.uploadFromStream(audioState, mp3Filepath);
          resolve();
        } catch (err) {
          this.logger.error('Error with upload from stream', { error: err });
          const externalError = new ExternalError('Failed to upload to S3', { originalError: err });
          this.errorHandler.handleError(externalError);
          this.responseBuilder.speak('There was an error uploading to S3');
          reject(externalError);
        }
      });

      writeMp3.on('error', (error) => {
        this.logger.error('Failed to write MP3 file', { error });
        const internalError = new InternalError('Failed to write MP3 file', { originalError: error });
        this.errorHandler.handleError(internalError);
        reject(internalError);
      });

      const mp3encoder = new Mp3Encoder(1, 16000, 48);
      const buffer: Buffer[] = [];

      readPcm.on('data', (chunk: Buffer | string) => {
        if (Buffer.isBuffer(chunk)) {
          buffer.push(chunk);
        }
      });

      readPcm.on('end', () => {
        const pcmData = Buffer.concat(buffer);
        const samples = new Int16Array(pcmData.buffer);
        const chunkSize = 1152;

        for (let i = 0; i < samples.length; i += chunkSize) {
          const chunk = samples.slice(i, i + chunkSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);

          if (mp3buf.length > 0) {
            writeMp3.write(mp3buf);
          }
        }

        const end = mp3encoder.flush();

        if (end.length > 0) {
          writeMp3.write(end);
        }

        writeMp3.end();
      });
    });
  }
}

export default Encoder;
