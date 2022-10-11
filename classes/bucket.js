const Stream = require('stream');
const xmlEscape = require('xml-escape');
const Alexa = require('ask-sdk-core');
const { S3 } = require('aws-sdk');

const S3_BUCKET = process.env.S3_BUCKET;

class Bucket {
    requestEnvelope;
    responseBuilder;
    s3Client;

    constructor(requestEnvelope, responseBuilder) {
        this.requestEnvelope = requestEnvelope;
        this.responseBuilder = responseBuilder;
        this.s3Client = new S3({});
    }
    // Create function to upload MP3 file to S3
    async uploadFromStream(audioState) {
        const streamPass = new Stream.PassThrough();
        const filename = this.requestEnvelope.session.user.userId;
        const s3Params = { Bucket: S3_BUCKET, Key: filename, Body: streamPass };

        console.log('[Bucket.uploadFromStream] Upload from stream started');

        const uploadPromise = this.s3Client.upload(s3Params).promise().then(() => {
            console.log('[Bucket.uploadFromStream] Upload done');

            // Upload has been successful - we can now issue an alexa response based upon microphone state
            let signedURL;

            // create a signed URL to the MP3 that expires after 5 seconds - this should be plenty of time to allow alexa to load and cache mp3
            const signedParams = {
                Bucket: S3_BUCKET,
                Key: filename,
                Expires: 10,
                ResponseContentType: 'audio/mpeg',
            };

            return this.s3Client.getSignedUrlPromise('getObject', signedParams).then((url) => {
                console.log('[Bucket.uploadFromStream] Got signed URL');

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

                console.log('[Bucket.uploadFromStream] Card content', cardContent);

                const cardTitle = 'Google Assistant for Alexa';

                // Let remove any (playing sfx)
                cardContent = cardContent.replace(/(\(playing sfx\))/g, '🔊');

                console.log('[Bucket.uploadFromStream] Add audio to response');
                this.responseBuilder.speak('<audio src="' + signedURL + '"/>');

                if (Alexa.getSupportedInterfaces(this.requestEnvelope)['Alexa.Presentation.APL']) {
                    this.responseBuilder.addDirective({
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
                    console.log('[Bucket.uploadFromStream] Microphone is open so keeping session open');
                    this.responseBuilder.reprompt(' ');
                } else {
                    // Otherwise we create an Alexa 'Tell' command which will close the session
                    console.log('[Bucket.uploadFromStream] Microphone is closed so closing session');
                    this.responseBuilder.withShouldEndSession(true);
                }
            });
        });

        return { uploadPromise: uploadPromise, streamPass: streamPass };
    }
}

module.exports = Bucket;
