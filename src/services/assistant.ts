import { ChannelCredentials, credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { AttributesManager, getLocale, ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import { createWriteStream, statSync } from 'fs';
import { OAuth2Client } from 'google-auth-library';
import { loadSync } from '@grpc/proto-loader';
import { getProtoPath } from 'google-proto-files';
import xmlEscape from 'xml-escape';
import { AudioState } from '../models/AudioState';
import Encoder from './encoder';
import Project from './project';
import { AssistRequest } from '../models/AssistRequest';

const GOOGLE_API_ENDPOINT = process.env.GOOGLE_API_ENDPOINT ?? '';
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID ?? '';
const DEVICE_LOCATION = (process.env.DEVICE_LOCATION ?? '').split(',');

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

const SUPPORTED_LOCALES = ['en-GB', 'de-DE', 'en-AU', 'en-CA', 'en-IN', 'ja-JP'];

class Assistant {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
  responseBuilder: ResponseBuilder;
  oauth2Client: OAuth2Client;
  encoder: Encoder;
  project: Project;

  constructor(requestEnvelope: RequestEnvelope, attributesManager: AttributesManager, responseBuilder: ResponseBuilder) {
    this.requestEnvelope = requestEnvelope;
    this.attributesManager = attributesManager;
    this.responseBuilder = responseBuilder;

    this.oauth2Client = new OAuth2Client();
    this.encoder = new Encoder(requestEnvelope, responseBuilder);
    this.project = new Project(requestEnvelope, attributesManager);
  }

  createGrpcGoogleCredentials(): ChannelCredentials {
    return credentials.combineChannelCredentials(credentials.createSsl(null), credentials.createFromGoogleCredential(this.oauth2Client));
  }

  async executeAssist(audioState: AudioState): Promise<void> {
    const accessToken = this.requestEnvelope.context.System.user.accessToken;

    // Check whether we have a valid authentication token
    if (!accessToken) {
      // We haven't so create an account link card
      this.responseBuilder
        .withLinkAccountCard()
        .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
        .withShouldEndSession(true);
      return;
    }

    // Update access token
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const sessionAttrs = this.attributesManager.getSessionAttributes();

    if (!sessionAttrs['registered']) {
      try {
        await this.project.registerProject();
        sessionAttrs['registered'] = true;
      } catch (err) {
        console.error('[Assistant.executeAssist] Client setup failed', err);
        this.responseBuilder.speak('There was a problem setting up the project.').withShouldEndSession(true);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      let audioLength = 0;
      let audioPresent = false;
      let conversationState: Buffer = Buffer.alloc(0);

      const grpcCredentials = this.createGrpcGoogleCredentials();
      const assistant = new assistantClient(GOOGLE_API_ENDPOINT, grpcCredentials);

      const skillTimeout = setTimeout(() => {
        if (!audioPresent) {
          this.responseBuilder.speak("I wasn't able to talk to Google - please try again");
          console.error('[Assistant.executeAssist] Google Assistant request timed out');
          return reject(new Error('Google Assistant request timed out'));
        }
      }, 9000);

      let responseFile = createWriteStream('/tmp/response.pcm', { flags: 'w' });

      responseFile.on('finish', async () => {
        console.log('[Assistant.executeAssist] Temporary response file has been written');
        clearTimeout(skillTimeout);

        const stats = statSync('/tmp/response.pcm');
        const fileSizeInBytes = stats.size;

        console.log('[Assistant.executeAssist] File size (bytes) is: ' + fileSizeInBytes);

        if (fileSizeInBytes > 0) {
          console.log('[Assistant.executeAssist] Starting execute encode');
          await this.encoder.executeEncode(audioState);
          console.log('[Assistant.executeAssist] Executed encode complete');
          return resolve();
        } else {
          console.log('[Assistant.executeAssist] Emitting blank sound');
          this.responseBuilder.speak("I didn't get an audio response from the Google Assistant");
          return reject(new Error('No audio response from the Google Assistant'));
        }
      });

      const locale = getLocale(this.requestEnvelope);
      const overrideLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en-US';

      const assistRequest: AssistRequest = {
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
                latitude: DEVICE_LOCATION[0],
                longitude: DEVICE_LOCATION[1],
              },
            },
            is_new_conversation: true,
          },
          device_config: {
            device_id: GOOGLE_PROJECT_ID,
            device_model_id: GOOGLE_PROJECT_ID,
          },
        },
      };

      const attributes = this.attributesManager.getRequestAttributes();

      if (attributes['CONVERSATION_STATE']) {
        console.log('[Assistant.executeAssist] Prior ConverseResponse detected');
        conversationState = Buffer.from(attributes['CONVERSATION_STATE']);
        assistRequest.config.dialog_state_in.conversation_state = conversationState;
        assistRequest.config.dialog_state_in.is_new_conversation = false;
      } else {
        console.log('[Assistant.executeAssist] No prior ConverseResponse');
      }

      const conversation = assistant.Assist();

      conversation.on('error', (err: Error) => {
        console.error('[Assistant.executeAssist] Got conversation error', err);
        this.responseBuilder.speak('The Google API returned an error.');

        attributes['CONVERSATION_STATE'] = undefined;

        return reject(new Error('Google Assistant returned error'));
      });

      conversation.on('end', () => {
        console.log('[Assistant.executeAssist] End of response from GRPC stub');

        attributes['CONVERSATION_STATE'] = undefined;

        responseFile.end();
      });

      conversation.on('data', (response: any) => {
        console.log('[Assistant.executeAssist] AssistResponse is', response);

        if (response.dialog_state_out) {
          if (response.dialog_state_out.supplemental_display_text) {
            console.log('[Assistant.executeAssist] Supplemental text is: ' + audioState.googleResponseText);
            audioState.googleResponseText += xmlEscape(JSON.stringify(response.dialog_state_out.supplemental_display_text));
          }

          if (response.dialog_state_out.microphone_mode) {
            if (response.dialog_state_out.microphone_mode === 'CLOSE_MICROPHONE') {
              console.log('[Assistant.executeAssist] Closing microphone');
              audioState.microphoneOpen = false;
              attributes['microphone_open'] = false;
            } else if (response.dialog_state_out.microphone_mode === 'DIALOG_FOLLOW_ON') {
              console.log('[Assistant.executeAssist] Keeping microphone open');
              audioState.microphoneOpen = true;
              attributes['microphone_open'] = true;
            }
          }

          if (response.dialog_state_out.conversation_state) {
            if (response.dialog_state_out.conversation_state.length > 0) {
              console.log('[Assistant.executeAssist] Conversation state changed');
              conversationState = response.dialog_state_out.conversation_state;
              console.log('[Assistant.executeAssist] Conversation state var is: ' + conversationState);
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
              console.log('[Assistant.executeAssist] Ignoring audio data as it is longer than 90 seconds');
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
