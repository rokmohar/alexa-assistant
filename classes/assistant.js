const grpc = require('@grpc/grpc-js');
const Alexa = require('ask-sdk-core');
const fs = require('fs');
const xmlEscape = require('xml-escape');
const { OAuth2Client } = require('google-auth-library');
const protoLoader = require('@grpc/proto-loader');
const { getProtoPath } = require('google-proto-files');
const Encoder = require('./encoder');
const Project = require('./project');

// Get Google Credentials from Environment Variables - these are set in the Lambda function configuration
const API_ENDPOINT = process.env.API_ENDPOINT;
const PROJECT_ID = process.env.PROJECT_ID;
const DEVICE_LOCATION = process.env.DEVICE_LOCATION.split(',');

const protoDefinition = protoLoader.loadSync('google/assistant/embedded/v1alpha2/embedded_assistant.proto', {
    includeDirs: [getProtoPath('..')],
    enums: String,
    longs: String,
    defaults: true,
    keepCase: true,
    oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(protoDefinition);
const assistantClient = protoDescriptor.google.assistant.embedded.v1alpha2.EmbeddedAssistant;

const SUPPORTED_LOCALES = ['en-GB', 'de-DE', 'en-AU', 'en-CA', 'en-IN', 'ja-JP'];

class Assistant {
    requestEnvelope;
    attributesManager;
    responseBuilder;
    oauth2Client;
    encoder;
    project;

    constructor(requestEnvelope, attributesManager, responseBuilder) {
        this.requestEnvelope = requestEnvelope;
        this.attributesManager = attributesManager;
        this.responseBuilder = responseBuilder;

        this.oauth2Client = new OAuth2Client();
        this.encoder = new Encoder(requestEnvelope, responseBuilder);
        this.project = new Project(requestEnvelope, attributesManager);
    }

    createGrpcGoogleCredentials() {
        return grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(null), grpc.credentials.createFromGoogleCredential(this.oauth2Client));
    }

    async executeAssist(audioState) {
        const accessToken = this.requestEnvelope.context.System.user.accessToken;

        // Check whether we have a valid authentication token
        if (!accessToken) {
            // We haven't so create an account link card
            return this.responseBuilder
                .withLinkAccountCard()
                .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
                .withShouldEndSession(true);
        }

        try {
            await this.project.registerProject();
        } catch (err) {
            console.error('Client setup failed:', err);
            return this.responseBuilder
                .speak('There was a problem setting up the project.')
                .withShouldEndSession(true);
        }

        return new Promise((resolve, reject) => {
            const locale = Alexa.getLocale(this.requestEnvelope);
            const overrideLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en-US';

            let audioLength = 0;
            let audioPresent = false;
            let conversationState = Buffer.alloc(0);

            // Update access token
            this.oauth2Client.setCredentials({ access_token: accessToken });

            const grpcCredentials = this.createGrpcGoogleCredentials();
            const assistant = new assistantClient(API_ENDPOINT, grpcCredentials);

            // create a timed event in case something causes the skill to stall
            // This will stop the skill from timing out
            setTimeout(() => {
                if (!audioPresent) {
                    this.responseBuilder.speak('I wasn\'t able to talk to Google - please try again');
                    console.error('Google Assistant request timed out');
                    return reject(new Error('Google Assistant request timed out'));
                }
            }, 10000);

            // create file into which we will stream pcm response from Google
            // Closing the stream into this file will trigger encoding into MP3
            console.log('Creating temp response file');

            let responseFile = fs.createWriteStream('/tmp/response.pcm', { flags: 'w' });

            responseFile.on('finish', async () => {
                console.log('temp response file has been written');

                const stats = fs.statSync('/tmp/response.pcm');
                const fileSizeInBytes = stats.size;

                console.log('files size is ' + fileSizeInBytes);

                // Check whether response file has any content. If it doesn't then we have a response with no audio
                if (fileSizeInBytes > 0) {
                    // encode MP3
                    await this.encoder.executeEncode(audioState);
                    return resolve();
                } else {
                    // Save setting and exit
                    this.responseBuilder.speak('I didn\'t get an audio response from the Google Assistant');
                    console.log('Emitting blank sound');
                    return reject(new Error('No audio response from the Google Assistant'));
                }
            });

            // Create Audio Configuration before we send any commands
            // We are using linear PCM as the input and output type so encoding value is 1
            console.log('Creating Audio config');

            const assistRequest = {
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
                            }
                        },
                        is_new_conversation: true,
                    },
                    device_config: {
                        device_id: PROJECT_ID,
                        device_model_id: PROJECT_ID,
                    },
                },
            };
            const attributes = this.attributesManager.getRequestAttributes();

            if (attributes['CONVERSATION_STATE']) {
                console.log('Prior ConverseResponse detected');
                conversationState = Buffer.from(attributes['CONVERSATION_STATE']);
                assistRequest.config.dialog_state_in.conversation_state = conversationState;
                assistRequest.config.dialog_state_in.is_new_conversation = false;
            } else {
                console.log('No prior ConverseResponse');
            }

            console.log('Current ConversationState is ', conversationState);
            console.log('AssistRequest is ', assistRequest);

            const conversation = assistant.Assist();

            conversation.on('error', (err) => {
                // Clear conversation state
                attributes['CONVERSATION_STATE'] = undefined;

                this.responseBuilder.speak('The Google API returned an error.');

                console.error('***There was a Google error***', err);
                return reject(new Error('Google Assistant returned error'))
            });

            conversation.on('end', () => {
                console.log('End of response from GRPC stub');

                // Close response file which will then trigger encode
                responseFile.end();

                // Clear conversation state
                attributes['CONVERSATION_STATE'] = undefined;
            });

            conversation.on('data', (response) => {
                console.log('AssistResponse is:', response);

                // Check there is actually a value in result
                if (response.dialog_state_out) {
                    console.log('Dialog state out received');

                    if (response.dialog_state_out.supplemental_display_text) {
                        audioState.googleResponseText += xmlEscape(JSON.stringify(response.dialog_state_out.supplemental_display_text));
                        console.log('Supplemental text is: ' + audioState.googleResponseText);
                    }

                    if (response.dialog_state_out.microphone_mode) {
                        if (response.dialog_state_out.microphone_mode === 'CLOSE_MICROPHONE') {
                            audioState.microphoneOpen = false;
                            attributes['microphone_open'] = false;
                            console.log('closing microphone');
                        } else if (response.dialog_state_out.microphone_mode === 'DIALOG_FOLLOW_ON') {
                            audioState.microphoneOpen = true;
                            attributes['microphone_open'] = true;
                            console.log('keeping microphone open');
                        }
                    }

                    if (response.dialog_state_out.conversation_state) {
                        if (response.dialog_state_out.conversation_state.length > 0) {
                            console.log('Conversation state changed');
                            conversationState = response.dialog_state_out.conversation_state;
                            console.log('Conversation state var is: ' + conversationState);
                            attributes['CONVERSATION_STATE'] = conversationState.toString();
                        }
                    }
                }

                // Deal with audio data from API
                if (response.audio_out) {
                    //console.log('audio received')
                    const audio_chunk = response.audio_out.audio_data;

                    if (audio_chunk instanceof Buffer) {
                        audioLength += audio_chunk.length;

                        if (!audioPresent) {
                            audioPresent = true;
                        }

                        // Total length of MP3's in alexa skills must be less than 90 seconds.
                        if (audioLength <= (90 * 16 * 16000) / 8) {
                            // Seconds x Bits per sample x samples per second / 8 to give bytes per second
                            responseFile.write(audio_chunk);
                        } else {
                            // we won't write any more timestamps
                            console.log('Ignoring audio data as it is longer than 90 seconds');
                        }
                    }
                }
            });

            conversation.write(assistRequest);
            conversation.end();
        });
    }
}

module.exports = Assistant;
