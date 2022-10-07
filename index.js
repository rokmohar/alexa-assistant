'use strict';

const { OAuth2Client } = require('google-auth-library');
const { getProtoPath } = require('google-proto-files');

const Alexa = require('ask-sdk-core');
const Adapter = require('ask-sdk-dynamodb-persistence-adapter');
const { S3 } = require('aws-sdk');
const Stream = require('stream');
const Volume = require('pcm-volume');

const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const lame = require('@suldashi/lame');
const axios = require('axios');
const xmlEscape = require('xml-escape');
const protoLoader = require('@grpc/proto-loader');

// Load AWS credentials
const s3 = new S3({});

// Get Google Credentials from Environment Variables - these are set in the Lambda function configuration
const S3_BUCKET = process.env.S3_BUCKET;
const API_ENDPOINT = process.env.API_ENDPOINT;

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

const clientState = {
    locale: undefined,
    s3Config: undefined,
    projectId: undefined,
    registered: false,
    initialized: false,
    oauth2Client: undefined,
    deviceLocation: undefined,
};

const SUPPORTED_LOCALES = ['en-GB', 'de-DE', 'en-AU', 'en-CA', 'en-IN', 'ja-JP'];

function getSecretParams() {
    const s3Params = {
        Bucket: S3_BUCKET,
        Key: 'client_secret.json',
    };

    console.log('Getting JSON');

    return new Promise((resolve, reject) => {
        s3.getObject(s3Params, async function (err, data) {
            if (err) {
                console.error('Could not load the client secret file:', err)
                return reject(new Error('I could not load the client secret file from S3'));
            }

            console.log('Current ConfigJSON:', clientState.s3Config);

            let s3Config;

            try {
                s3Config = JSON.parse(Buffer.from(data.Body).toString('utf8'));
            } catch (err) {
                console.error('S3 body decode error:', err);
                return reject(new Error('Decoding of S3 response body failed'));
            }

            if (!s3Config || !s3Config.hasOwnProperty('web')) {
                console.error('Client secret file is not configured');
                return reject(new Error('The client secret file was not configured for a web based client'));
            }

            console.log('S3 Config is loaded:', s3Config);

            const clientId = s3Config.web.client_id;
            const redirectUri = s3Config.web.redirect_uris[0];
            const clientSecret = s3Config.web.client_secret;

            clientState.s3Config = s3Config;
            clientState.projectId = s3Config.web.project_id;
            clientState.registered = !!s3Config.registered;
            clientState.initialized = true;
            clientState.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
            clientState.deviceLocation = s3Config.device_location;

            return resolve();
        });
    });
}

async function registerProject(handlerInput) {
    console.log('Project registration started');

    if (clientState.registered) {
        console.warn('Project is already registered');
        return;
    }

    if (!clientState.initialized) {
        try {
            await getSecretParams();
        } catch (err) {
            console.error('Loading of SecretParams failed:', err);
            throw err;
        }
    }

    // This isn't massively efficient code, but it only needs to run once!
    const ACCESS_TOKEN = handlerInput.requestEnvelope.context.System.user.accessToken;

    console.log('Access Token: ' + ACCESS_TOKEN);

    // Authenticate against Google OAUTH2
    clientState.oauth2Client.setCredentials({ access_token: ACCESS_TOKEN });

    const registrationModelURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + clientState.projectId + '/deviceModels/';
    const registrationInstanceURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + clientState.projectId + '/devices/';

    // Create Stub
    const bearer = 'Bearer ' + ACCESS_TOKEN;

    // Registering Model
    const registerModel = function (callback) {
        const deviceModel = {
            project_id: clientState.projectId,
            device_model_id: clientState.projectId,
            manifest: {
                manufacturer: 'Assistant SDK developer',
                product_name: 'Alexa Assistant v1',
                device_description: 'Alexa Assistant Skill v1',
            },
            device_type: 'action.devices.types.LIGHT',
            traits: ['action.devices.traits.OnOff'],
        };
        axios({
            url: registrationModelURL,
            method: 'POST',
            headers: {
                'Authorization': bearer,
                'Content-Type': 'application/json',
            },
            data: deviceModel,
            responseType: 'json',
        })
            .then(function ( bodyJSON) {
                if (bodyJSON.error) {
                    console.error('error code received');

                    if (bodyJSON.error.code === 409) {
                        console.error('Model already exists');
                        callback(null, bodyJSON);
                    } else {
                        callback(bodyJSON, null);
                    }
                } else {
                    callback(null, bodyJSON);
                }
            })
            .catch(function (error) {
                callback(error, null);
            });
    };
    // Registering instance
    const registerInstance = function (callback) {
        const instanceModel = {
            id: clientState.projectId,
            model_id: clientState.projectId,
            nickname: 'Alexa Assistant v1',
            clientType: 'SDK_SERVICE',
        };
        axios({
            url: registrationInstanceURL,
            method: 'POST',
            headers: {
                'Authorization': bearer,
                'Content-Type': 'application/json',
            },
            data: instanceModel,
            responseType: 'json',
        }).then(function (bodyJSON) {
            if (bodyJSON.error) {
                console.error('error code received');

                if (bodyJSON.error.code === 409) {
                    console.error('Instance already exists');
                    callback(null, bodyJSON);
                } else {
                    callback(bodyJSON, null);
                }
            } else {
                callback(null, bodyJSON);
            }
        }).catch(function (error) {
            callback(error, null);
        });
    };
    return new Promise((resolve, reject) => {
        // let's register the model and instance - we only need to do this once
        registerModel(function (err, result) {
            if (err) {
                console.error('Got Model register error', err);
                return reject(new Error('There was an error registering the Model with the Google API'));
            } else if (result) {
                console.log('Got positive model response', result);
                registerInstance(function (err, result) {
                    if (err) {
                        console.error('Error:', err);
                        return reject(new Error('There was an error registering the Instance with the Google API'));
                    }

                    console.log('Got positive Instance response');

                    const s3Body = {
                        ...clientState.s3Config,
                        registered: true,
                    };
                    const s3Params = {
                        Bucket: S3_BUCKET,
                        Key: 'client_secret.json',
                        Body: JSON.stringify(s3Body),
                        ContentType: 'application/json',
                    };

                    s3.upload(s3Params, {}, function (err, data) {
                        if (err) {
                            console.error('Error with S3 upload:', err);
                            return reject(new Error('There was an error uploading to S3'));
                        }

                        const attributes = handlerInput.attributesManager.getRequestAttributes();

                        clientState.s3Config = s3Body;
                        attributes['microphone_open'] = false;

                        return resolve();
                    });
                });
            }
        });
    });
}

function createGrpcGoogleCredentials() {
    return grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(null), grpc.credentials.createFromGoogleCredential(clientState.oauth2Client));
}

async function executeAssist(token, audioState, handlerInput) {
    return new Promise((resolve, reject) => {
        let audioLength = 0;
        let audioPresent = false;
        let overrideLocale = 'en-US';
        let conversationState = Buffer.alloc(0);

        console.log('Locale is: ' + clientState.locale);

        if (SUPPORTED_LOCALES.includes(clientState.locale)) {
            overrideLocale = clientState.locale;
        }

        // Update access token
        clientState.oauth2Client.setCredentials({ access_token: token });

        const grpcCredentials = createGrpcGoogleCredentials();
        const assistant = new assistantClient(API_ENDPOINT, grpcCredentials);

        // create a timed event in case something causes the skill to stall
        // This will stop the skill from timing out
        setTimeout(function () {
            if (!audioPresent) {
                handlerInput.responseBuilder.speak('I wasn\'t able to talk to Google - please try again');
                console.error('Google Assistant request timed out');
                return reject(new Error('Google Assistant request timed out'));
            }
        }, 9000);

        // create file into which we will stream pcm response from Google
        // Closing the stream into this file will trigger encoding into MP3
        console.log('Creating temp response file');

        let responseFile = fs.createWriteStream('/tmp/response.pcm', { flags: 'w' });

        responseFile.on('finish', async function () {
            console.log('temp response file has been written');

            const stats = fs.statSync('/tmp/response.pcm');
            const fileSizeInBytes = stats.size;

            console.log('files size is ' + fileSizeInBytes);

            // Check whether response file has any content. If it doesn't then we have a response with no audio
            if (fileSizeInBytes > 0) {
                // encode MP3
                await executeEncode(audioState, handlerInput);
                return resolve();
            } else {
                // Save setting and exit
                handlerInput.responseBuilder.speak('I didn\'t get an audio response from the Google Assistant');
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
                    device_location: clientState.deviceLocation,
                    is_new_conversation: true,
                },
                device_config: {
                    device_id: clientState.projectId,
                    device_model_id: clientState.projectId,
                },
            },
        };
        const attributes = handlerInput.attributesManager.getRequestAttributes();

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

        conversation.on('error', function(err) {
            // Clear conversation state
            attributes['CONVERSATION_STATE'] = undefined;

            handlerInput.responseBuilder.speak('The Google API returned an error.');

            console.error('***There was a Google error***', err);
            return reject(new Error('Google Assistant returned error'))
        });

        conversation.on('end', function() {
            console.log('End of response from GRPC stub');

            // Close response file which will then trigger encode
            responseFile.end();

            // Clear conversation state
            attributes['CONVERSATION_STATE'] = undefined;
        });

        conversation.on('data', function(response) {
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

// This function takes the response from the API and re-encodes using LAME
// There is lots of reading and writing from temp files which isn't ideal,
// but I couldn't get piping to/from LAME work reliably in Lambda
async function executeEncode(audioState, handlerInput) {
    return new Promise((resolve, reject) => {
        console.log('Starting Transcode');

        // Read the linear PCM response from file and create stream
        const readpcm = fs.createReadStream('/tmp/response.pcm');

        readpcm.on('end', function() {
            console.log('pcm stream read complete');
        });

        // Create file to which MP3 will be written
        const writemp3 = fs.createWriteStream('/tmp/response.mp3');

        // Log when MP3 file is written
        writemp3.on('finish', async function() {
            console.log('mp3 has been written');

            // Create read stream from MP3 file
            const readmp3 = fs.createReadStream('/tmp/response.mp3');

            try {
                const uploadResponse = await uploadFromStream();

                // Pipe to S3 upload function
                readmp3.pipe(uploadResponse.streamPass);

                await uploadResponse.uploadPromise;
            } catch (err) {
                console.error('Error with upload from stream:', err);
                handlerInput.responseBuilder.speak('There was an error uploading to S3');
                return reject(new Error('Error with upload from stream'));
            }

            console.log('Upload from stream complete');

            return resolve();
        });

        // Create LAME encoder instance
        const encoder = new lame.Encoder({
            // input
            channels: 1, // 1 channels (MONO)
            bitDepth: 16, // 16-bit samples
            sampleRate: 16000, // 16,000 Hz sample rate
            // output
            bitRate: 48,
            outSampleRate: 16000,
            mode: lame.JOINTSTEREO, // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
        });

        // The output from the Google Assistant is much lower than Alexa, so we need to apply a gain
        const vol = new Volume();

        // Set volume gain on Google output to be +75%
        // Any more than this then we risk major clipping
        vol.setVolume(1.75);

        // Create function to upload MP3 file to S3
        async function uploadFromStream() {
            const streamPass = new Stream.PassThrough();
            const filename = handlerInput.requestEnvelope.session.user.userId;
            const s3Params = { Bucket: S3_BUCKET, Key: filename, Body: streamPass };

            console.log('Upload from stream');

            const uploadPromise = s3.upload(s3Params).promise().then(() => {
                console.log('Upload done');

                // Upload has been successful - we can now issue an alexa response based upon microphone state
                let signedURL;

                // create a signed URL to the MP3 that expires after 5 seconds - this should be plenty of time to allow alexa to load and cache mp3
                const signedParams = {
                    Bucket: S3_BUCKET,
                    Key: filename,
                    Expires: 10,
                    ResponseContentType: 'audio/mpeg',
                };

                return s3.getSignedUrlPromise('getObject', signedParams).then(function(url) {
                    console.log('Got signed URL');

                    // escape out any illegal XML characters;
                    url = xmlEscape(url);
                    signedURL = url;

                    // if response text is blank just add a speaker icon to response
                    if (!audioState.googleResponseText) {
                        audioState.googleResponseText = '"🔊"';
                    }

                    // remove any REPEAT AFTER ME form alexa utterance
                    const cleanUtterance = audioState.alexaUtteranceText.replace('REPEAT AFTER ME ', '');
                    let cardContent = 'Request:<br/><i>' + cleanUtterance + '</i><br/><br/>Supplemental Response:<br/>' + audioState.googleResponseText;

                    // replace carriage returns with breaks
                    cardContent = cardContent.replace(/\\n/g, '<br/>');

                    // deal with any \&quot;
                    cardContent = cardContent.replace(/\\&quot;/g, '&quot;');

                    console.log('Card content:', cardContent);

                    const cardTitle = 'Google Assistant for Alexa';

                    // Let remove any (playing sfx)
                    cardContent = cardContent.replace(/(\(playing sfx\))/g, '🔊');

                    console.log('Add audio speak to response');
                    handlerInput.responseBuilder.speak('<audio src="' + signedURL + '"/>');

                    if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                        handlerInput.responseBuilder.addDirective({
                            type: 'Alexa.Presentation.APL.RenderDocument',
                            token: 'template1',
                            document: {
                                type: 'APL',
                                version: '2022.1',
                                description: 'Google Assistant for Alexa APL document.',
                                theme: 'dark',
                                mainTemplate: {
                                    parameters: [
                                        'payload'
                                    ],
                                    items: [
                                        {
                                            type: 'AlexaDetail',
                                            detailType: 'generic',
                                            headerTitle: cardTitle,
                                            primaryText: {
                                                text: cardContent,
                                                type: 'RichText'
                                            }
                                        }
                                    ]
                                }
                            }
                        });
                    }

                    // If API has requested Microphone to stay open then will create an Alexa 'Ask' response
                    // We also keep the microphone on the launch intent 'Hello' request as for some reason the API closes the microphone
                    if (audioState.microphoneOpen || audioState.alexaUtteranceText === 'Hello') {
                        console.log('Microphone is open so keeping session open');
                        handlerInput.responseBuilder.reprompt(' ');
                    } else {
                        // Otherwise we create an Alexa 'Tell' command which will close the session
                        console.log('Microphone is closed so closing session');
                        handlerInput.responseBuilder.withShouldEndSession(true);
                    }
                });
            });

            return { uploadPromise: uploadPromise, streamPass: streamPass };
        }

        // When encoding of MP3 has finished we upload the result to S3
        encoder.on('finish', function() {
            setTimeout(function() {
                // Close the MP3 file
                console.log('Encoding done!');
                console.log('Streaming mp3 file to s3');
                writemp3.end();
            });
        });

        // Pipe output of PCM file reader to the gain process
        readpcm.pipe(vol);

        // pipe the pcm output of the gain process to the LAME encoder
        vol.pipe(encoder);

        // Pipe output of LAME encoder into MP3 file writer
        encoder.pipe(writemp3);
    });
}

const LaunchRequestHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle: async function (handlerInput) {
        console.log('Launch Request');

        if (!handlerInput.requestEnvelope.context.System.user.accessToken) {
            return handlerInput.responseBuilder
                .withLinkAccountCard()
                .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
                .withShouldEndSession(true)
                .getResponse();
        }

        try {
            await getSecretParams();
        } catch (err) {
            console.error('Loading of SecretParams failed:', err);
            return handlerInput.responseBuilder
                .speak('There was a problem loading the settings from the S3 Bucket.')
                .withShouldEndSession(true)
                .getResponse();
        }

        if (!clientState.registered) {
            try {
                await registerProject(handlerInput);
            } catch (err) {
                console.error('Client setup failed:', err);
                return handlerInput.responseBuilder
                    .speak('There was a problem setting up the project.')
                    .withShouldEndSession(true)
                    .getResponse();
            }

            console.log('Registration Function Complete');
        }

        return handlerInput.responseBuilder.getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle: function (handlerInput) {
        console.log('Session ended Request');
        console.log(`Session has ended with reason ${handlerInput.requestEnvelope.request.reason}`);

        if (handlerInput.requestEnvelope.request.error) {
            console.log(`Session error`, handlerInput.requestEnvelope.request.error);
        }

        // Google Assistant will keep the conversation thread open even if we don't give a response to an ask.
        // We need to close the conversation if an ask response is not given (which will end up here)
        // The easiest way to do this is to just send a goodbye command and this will close the conversation for us
        // (this is against Amazons guides, but we're not submitting this!)
        const attributes = handlerInput.attributesManager.getRequestAttributes();

        if (attributes['microphone_open']) {
            return SearchIntentHandler.handle(handlerInput, 'goodbye');
        }

        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .getResponse();
    },
};

const SearchIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SearchIntent';
    },
    handle: async function (handlerInput, overrideText) {
        console.log('Search Intent');

        const audioState = {
            microphoneOpen: true,
            alexaUtteranceText: '',
            googleResponseText: '',
        };

        // Have we received a direct utterance from another intent?
        if (overrideText) {
            audioState.alexaUtteranceText = overrideText;
            console.log('Utterance received from another intent: ' + overrideText);
        } else {
            // use detected utterance
            audioState.alexaUtteranceText = handlerInput.requestEnvelope.request.intent.slots.search.value;
        }

        console.log('Input text to be processed is "' + audioState.alexaUtteranceText + '"');
        console.log('Starting Search Intent');

        const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;

        // Check whether we have a valid authentication token
        if (!accessToken) {
            // We haven't so create an account link card
            return handlerInput.responseBuilder
                .withLinkAccountCard()
                .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
                .withShouldEndSession(true)
                .getResponse();
        }

        try {
            await getSecretParams();
        } catch (err) {
            console.error('Loading of SecretParams failed:', err);
            return handlerInput.responseBuilder
                .speak('There was a problem loading the settings from the S3 Bucket.')
                .withShouldEndSession(true)
                .getResponse();
        }

        if (!clientState.registered) {
            try {
                await registerProject(handlerInput);
            } catch (err) {
                console.error('Client setup failed:', err);
                return handlerInput.responseBuilder
                    .speak('There was a problem setting up the project.')
                    .withShouldEndSession(true)
                    .getResponse();
            }
        }

        try {
            console.log('token: ' + accessToken);
            await executeAssist(accessToken, audioState, handlerInput);
        } catch (err) {
            console.log('Execute assist returned error:', err);
            handlerInput.responseBuilder.withShouldEndSession(true);
        }

        return handlerInput.responseBuilder.getResponse();
    },
};

const StopIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent';
    },
    handle: function (handlerInput) {
        console.log('Stop Intent');

        const attributes = handlerInput.attributesManager.getRequestAttributes();

        if (attributes['microphone_open']) {
            return SearchIntentHandler.handle(handlerInput, 'stop');
        }

        return handlerInput.responseBuilder
            .speak('Stopped')
            .withShouldEndSession(true)
            .getResponse();
    },
};

const HelpIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle: function (handlerInput) {
        console.log('Help Intent');
        return SearchIntentHandler.handle(handlerInput, 'What can you do');
    },
};

const CancelIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent';
    },
    handle: function (handlerInput) {
        console.log('Cancel Intent');

        const attributes = handlerInput.attributesManager.getRequestAttributes();

        if (attributes['microphone_open']) {
            return SearchIntentHandler.handle(handlerInput, 'cancel');
        }

        return handlerInput.responseBuilder
            .speak('Cancelled')
            .withShouldEndSession(true)
            .getResponse();
    },
};

const YesIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
    },
    handle: function (handlerInput) {
        console.log('Yes Intent');

        const attributes = handlerInput.attributesManager.getRequestAttributes();

        if (attributes['microphone_open']) {
            return SearchIntentHandler.handle(handlerInput, 'yes');
        }

        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .getResponse();
    },
};

const NoIntentHandler = {
    canHandle: function (handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
    },
    handle: function (handlerInput) {
        console.log('No Intent');

        const attributes = handlerInput.attributesManager.getRequestAttributes();

        if (attributes['microphone_open']) {
            return SearchIntentHandler.handle(handlerInput, 'no');
        }

        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .getResponse();
    },
};

const UnhandledHandler = {
    canHandle: function (handlerInput) {
        return true;
    },
    handle: function (handlerInput) {
        console.log('Unhandled event');
        return handlerInput.responseBuilder
            .reprompt('I\'m not sure what you said. Can you repeat please')
            .getResponse();
    },
};

const requestHandlers = [
    LaunchRequestHandler,
    SessionEndedRequestHandler,
    SearchIntentHandler,
    StopIntentHandler,
    HelpIntentHandler,
    CancelIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    UnhandledHandler,
];

exports.handler = async function (event, context, callback) {
    clientState.locale = event.request.locale;

    const skillBuilder = Alexa.SkillBuilders.custom();

    skillBuilder.addRequestHandlers(...requestHandlers);
    skillBuilder.withPersistenceAdapter(new Adapter.DynamoDbPersistenceAdapter({
        tableName: 'AlexaAssistantSkillSettings',
    }))

    const response = await skillBuilder.create().invoke(event, context);

    console.log('response is', response);

    return response;
};
