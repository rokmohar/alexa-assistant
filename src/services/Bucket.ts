import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import xmlEscape from 'xml-escape';
import { S3 } from 'aws-sdk';
import { RequestEnvelope } from 'ask-sdk-model';
import { getSupportedInterfaces, ResponseBuilder } from 'ask-sdk-core';
import { IBucket, IBucketConfig, IBucketDependencies } from '../interfaces/IBucket';
import { Logger } from './Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { ExternalError } from '../errors/AppError';
import { IAudioState } from '../interfaces/IAudioState';

class Bucket implements IBucket {
  private readonly requestEnvelope: RequestEnvelope;
  private readonly responseBuilder: ResponseBuilder;
  private readonly config: IBucketConfig;
  private readonly s3Client: S3;
  private readonly logger: Logger;
  private readonly errorHandler: ErrorHandler;

  constructor(dependencies: IBucketDependencies, config: IBucketConfig) {
    this.requestEnvelope = dependencies.requestEnvelope;
    this.responseBuilder = dependencies.responseBuilder;
    this.config = config;
    this.s3Client = new S3({});
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  async uploadFromStream(audioState: IAudioState, streamFile: string): Promise<void> {
    this.logger.info('Upload from stream started');

    const stream = new PassThrough();
    const readMp3 = createReadStream(streamFile);
    readMp3.pipe(stream);

    const keyName = this.requestEnvelope.session?.user?.userId ?? 'default-user';
    const s3Params = { Bucket: this.config.s3Bucket, Key: keyName, Body: stream };

    try {
      await this.s3Client.upload(s3Params).promise();
      this.logger.info('Upload done');

      const signedParams = {
        Bucket: this.config.s3Bucket,
        Key: keyName,
        Expires: 10,
        ResponseContentType: 'audio/mpeg',
      };

      const url = await this.s3Client.getSignedUrlPromise('getObject', signedParams);
      this.logger.info('Got signed URL');

      const signedURL = xmlEscape(url);
      audioState.googleResponseText = audioState.googleResponseText ?? '"🔊"';

      const cleanUtterance = audioState.alexaUtteranceText.replace('REPEAT AFTER ME ', '');
      let cardContent = `Request:<br/><i>${cleanUtterance}</i><br/><br/>Supplemental Response:<br/>${audioState.googleResponseText}`;

      cardContent = cardContent
        .replace(/\\n/g, '<br/>')
        .replace(/\\&quot;/g, '&quot;')
        .replace(/(\(playing sfx\))/g, '🔊');

      const cardTitle = 'Google Assistant for Alexa';

      this.responseBuilder.speak(`<audio src="${signedURL}"/>`);

      if (getSupportedInterfaces(this.requestEnvelope)['Alexa.Presentation.APL']) {
        this.responseBuilder.addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          token: 'template1',
          document: {
            type: 'APL',
            version: '2022.1',
            description: 'Google Assistant for Alexa APL document.',
            theme: 'dark',
            mainTemplate: {
              parameters: ['payload'],
              items: [
                {
                  type: 'AlexaDetail',
                  detailType: 'generic',
                  headerTitle: cardTitle,
                  primaryText: {
                    text: cardContent,
                    type: 'RichText',
                  },
                },
              ],
            },
          },
        });
      }

      if (audioState.microphoneOpen || audioState.alexaUtteranceText === 'Hello') {
        this.logger.info('Microphone is open so keeping session open');
        this.responseBuilder.reprompt(' ');
      } else {
        this.logger.info('Microphone is closed so closing session');
        this.responseBuilder.withShouldEndSession(true);
      }
    } catch (error) {
      this.logger.error('Error uploading to S3', { error });
      const externalError = new ExternalError('Failed to upload to S3', { originalError: error });
      this.errorHandler.handleError(externalError);
      throw externalError;
    }
  }
}

export default Bucket;
