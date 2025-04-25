import { ChannelCredentials, credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { getLocale } from 'ask-sdk-core';
import { createWriteStream, statSync } from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { loadSync } from '@grpc/proto-loader';
import { getProtoPath } from 'google-proto-files';
import xmlEscape from 'xml-escape';
import { Logger } from './Logger';
import { ErrorHandler } from '../errors/ErrorHandler';
import { ExternalError, InternalError, TimeoutError } from '../errors/AppError';
import { IAssistant, IAssistantDependencies, IAssistantConfig } from '../interfaces/IAssistant';
import { IProject } from '../interfaces/IProject';
import { IEncoder } from '../interfaces/IEncoder';
import { ServiceFactory } from '../factories/ServiceFactory';
import { IAudioState } from '../interfaces/IAudioState';
import { IAssistRequest } from '../interfaces/IAssistRequest';

const protoDefinition = loadSync('google/assistant/embedded/v1alpha2/embedded_assistant.proto', {
  includeDirs: [getProtoPath('..')],
  enums: String,
  longs: String,
  defaults: true,
  keepCase: true,
  oneofs: true,
});
const protoDescriptor = loadPackageDefinition(protoDefinition);
const assistantClient = (protoDescriptor.google as any).assistant.embedded.v1alpha2.EmbeddedAssistant;

class Assistant implements IAssistant {
  private readonly requestEnvelope: IAssistantDependencies['requestEnvelope'];
  private readonly attributesManager: IAssistantDependencies['attributesManager'];
  private readonly responseBuilder: IAssistantDependencies['responseBuilder'];
  private readonly oauth2Client: OAuth2Client;
  private readonly logger: Logger;
  private readonly errorHandler: ErrorHandler;
  private readonly config: IAssistantConfig;
  private readonly project: IProject;
  private readonly encoder: IEncoder;

  constructor(dependencies: IAssistantDependencies, config: IAssistantConfig) {
    this.requestEnvelope = dependencies.requestEnvelope;
    this.attributesManager = dependencies.attributesManager;
    this.responseBuilder = dependencies.responseBuilder;
    this.config = config;
    this.oauth2Client = new OAuth2Client();
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.project = ServiceFactory.getInstance().createProject({
      requestEnvelope: this.requestEnvelope,
      attributesManager: this.attributesManager,
    });
    this.encoder = ServiceFactory.getInstance().createEncoder({
      requestEnvelope: this.requestEnvelope,
      responseBuilder: this.responseBuilder,
    });
  }

  private createGrpcGoogleCredentials(): ChannelCredentials {
    return credentials.combineChannelCredentials(credentials.createSsl(null), credentials.createFromGoogleCredential(this.oauth2Client));
  }

  async executeAssist(audioState: IAudioState): Promise<void> {
    const accessToken = this.requestEnvelope.context.System.user.accessToken;

    if (!accessToken) {
      this.logger.warn('No access token provided', { userId: this.requestEnvelope.context.System.user.userId });
      this.responseBuilder
        .withLinkAccountCard()
        .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
        .withShouldEndSession(true);
      return;
    }

    this.oauth2Client.setCredentials({ access_token: accessToken });
    const sessionAttrs = this.attributesManager.getSessionAttributes();

    if (!sessionAttrs['registered']) {
      try {
        await this.project.registerProject();
        sessionAttrs['registered'] = true;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new InternalError('Unknown error during project registration');
        this.errorHandler.handleError(error);
        this.responseBuilder.speak('There was a problem setting up the project.').withShouldEndSession(true);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      let audioLength = 0;
      let audioPresent = false;
      let conversationState: Buffer = Buffer.alloc(0);

      const grpcCredentials = this.createGrpcGoogleCredentials();
      const assistant = new assistantClient(this.config.googleApiEndpoint, grpcCredentials);

      const skillTimeout = setTimeout(() => {
        if (!audioPresent) {
          const error = new TimeoutError('Google Assistant request timed out');
          this.errorHandler.handleError(error);
          this.responseBuilder.speak("I wasn't able to talk to Google - please try again");
          return reject(error);
        }
      }, 9000);

      let responseFile = createWriteStream('/tmp/response.pcm', { flags: 'w' });

      responseFile.on('finish', async () => {
        this.logger.info('Temporary response file has been written');
        clearTimeout(skillTimeout);

        const stats = statSync('/tmp/response.pcm');
        const fileSizeInBytes = stats.size;

        this.logger.debug('Response file size', { size: fileSizeInBytes });

        if (fileSizeInBytes > 0) {
          this.logger.info('Starting audio encoding');
          await this.encoder.executeEncode(audioState);
          this.logger.info('Audio encoding complete');
          return resolve();
        } else {
          const error = new ExternalError('No audio response from the Google Assistant');
          this.errorHandler.handleError(error);
          this.responseBuilder.speak("I didn't get an audio response from the Google Assistant");
          return reject(error);
        }
      });

      const locale = getLocale(this.requestEnvelope);
      const overrideLocale = this.config.supportedLocales.includes(locale) ? locale : 'en-US';

      const assistRequest: IAssistRequest = {
        config: {
          text_query: audioState.alexaUtteranceText,
          audio_out_config: {
            encoding: 1,
            volume_percentage: 100,
            sample_rate_hertz: 16000,
          },
          dialog_state_in: {
            language_code: overrideLocale,
            device_location: {
              coordinates: {
                latitude: this.config.deviceLocation[0],
                longitude: this.config.deviceLocation[1],
              },
            },
            is_new_conversation: true,
          },
          device_config: {
            device_id: this.config.googleProjectId,
            device_model_id: this.config.googleProjectId,
          },
        },
      };

      const attributes = this.attributesManager.getRequestAttributes();

      if (attributes['CONVERSATION_STATE']) {
        this.logger.debug('Prior conversation state detected');
        conversationState = Buffer.from(attributes['CONVERSATION_STATE']);
        assistRequest.config.dialog_state_in.conversation_state = conversationState;
        assistRequest.config.dialog_state_in.is_new_conversation = false;
      } else {
        this.logger.debug('No prior conversation state');
      }

      const conversation = assistant.Assist();

      conversation.on('error', (err: Error) => {
        const error = new ExternalError('Google Assistant returned error', { originalError: err });
        this.errorHandler.handleError(error);
        this.responseBuilder.speak('The Google API returned an error.');
        attributes['CONVERSATION_STATE'] = undefined;
        return reject(error);
      });

      conversation.on('end', () => {
        this.logger.info('End of response from GRPC stub');
        attributes['CONVERSATION_STATE'] = undefined;
        responseFile.end();
      });

      conversation.on('data', (response: any) => {
        this.logger.debug('Received AssistResponse', { response });

        if (response.dialog_state_out) {
          if (response.dialog_state_out.supplemental_display_text) {
            this.logger.debug('Supplemental text received', { text: response.dialog_state_out.supplemental_display_text });
            audioState.googleResponseText += xmlEscape(JSON.stringify(response.dialog_state_out.supplemental_display_text));
          }

          if (response.dialog_state_out.microphone_mode) {
            if (response.dialog_state_out.microphone_mode === 'CLOSE_MICROPHONE') {
              this.logger.debug('Closing microphone');
              audioState.microphoneOpen = false;
              attributes['microphone_open'] = false;
            } else if (response.dialog_state_out.microphone_mode === 'DIALOG_FOLLOW_ON') {
              this.logger.debug('Keeping microphone open');
              audioState.microphoneOpen = true;
              attributes['microphone_open'] = true;
            }
          }

          if (response.dialog_state_out.conversation_state) {
            if (response.dialog_state_out.conversation_state.length > 0) {
              this.logger.debug('Conversation state updated');
              conversationState = response.dialog_state_out.conversation_state;
              attributes['CONVERSATION_STATE'] = conversationState.toString();
            }
          }
        }

        if (response.audio_out) {
          const audio_chunk = response.audio_out.audio_data;

          if (audio_chunk instanceof Buffer) {
            audioLength += audio_chunk.length;

            if (!audioPresent) {
              audioPresent = true;
            }

            if (audioLength <= (90 * 16 * 16000) / 8) {
              responseFile.write(audio_chunk);
            } else {
              this.logger.warn('Audio data too long, ignoring', { length: audioLength });
            }
          }
        }
      });

      conversation.write(assistRequest);
      conversation.end();
    });
  }
}

export default Assistant;
