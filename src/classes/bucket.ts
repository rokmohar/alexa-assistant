import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import xmlEscape from 'xml-escape';
import { S3 } from 'aws-sdk';
import { RequestEnvelope } from 'ask-sdk-model';
import { getSupportedInterfaces, ResponseBuilder } from 'ask-sdk-core';
import { AudioState } from '../models/AudioState';

const S3_BUCKET = process.env.S3_BUCKET ?? '';

class Bucket {
  private requestEnvelope: RequestEnvelope;
  private responseBuilder: ResponseBuilder;
  private s3Client: S3;

  constructor(requestEnvelope: RequestEnvelope, responseBuilder: ResponseBuilder) {
    this.requestEnvelope = requestEnvelope;
    this.responseBuilder = responseBuilder;
    this.s3Client = new S3({});
  }

  uploadFromStream(audioState: AudioState, streamFile: string): Promise<void> {
    console.log('[Bucket.uploadFromStream] Upload from stream started');

    const stream = new PassThrough();
    const readMp3 = createReadStream(streamFile);
    readMp3.pipe(stream);

    const keyName = this.requestEnvelope.session?.user?.userId ?? 'default-user';
    const s3Params = { Bucket: S3_BUCKET, Key: keyName, Body: stream };

    return this.s3Client
      .upload(s3Params)
      .promise()
      .then(() => {
        console.log('[Bucket.uploadFromStream] Upload done');

        const signedParams = {
          Bucket: S3_BUCKET,
          Key: keyName,
          Expires: 10,
          ResponseContentType: 'audio/mpeg',
        };

        return this.s3Client.getSignedUrlPromise('getObject', signedParams).then((url) => {
          console.log('[Bucket.uploadFromStream] Got signed URL');

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
            console.log('[Bucket.uploadFromStream] Microphone is open so keeping session open');
            this.responseBuilder.reprompt(' ');
          } else {
            console.log('[Bucket.uploadFromStream] Microphone is closed so closing session');
            this.responseBuilder.withShouldEndSession(true);
          }
        });
      });
  }
}

export default Bucket;
