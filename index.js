'use strict';


var Alexa = require('alexa-sdk');
var google = require('./node_modules/googleapis');
const AWS = require('aws-sdk');
var fs = require('fs');
var every = require('every-moment');
var wait = require('wait-one-moment');
const Stream = require("stream");
var Speech = require('ssml-builder');
var lame = require('lame');
var grpc = require('grpc')
var resolve = require('path').resolve;


var OAuth2 = google.auth.OAuth2;


var assistant;
var audio_chunk = 0;
var microphoneOpen = true;
var sendingAudio = false;

// create JSON string to hold config
var config = {};

// Load AWS credentials
const Polly = new AWS.Polly({apiVersion: '2016-06-10'});
var s3 = new AWS.S3();

                
const blank_audio_long = Buffer.alloc(80000,0); 


// Get Google Credentials from Evironment Variables - these are set in the Lambda function configuration

const VERSION_NUMBER = '1.0';
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URL;
var API_ENDPOINT = process.env.API_ENDPOINT;
var S3_BUCKET = process.env.S3_BUCKET;




var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// load assistant API proto and bind using grpc

const protoDescriptor = grpc.load({
  file: 'assistant/embedded/v1alpha1/embedded_assistant.proto',
  root: resolve(__dirname, 'proto')
});

const EmbeddedAssistantClient = protoDescriptor.google.assistant.embedded.v1alpha1.EmbeddedAssistant;

const embedded_assistant = protoDescriptor.google.assistant.embedded.v1alpha1;
const callCreds = new grpc.Metadata();


const END_OF_UTTERANCE = 'END_OF_UTTERANCE';
const EVENT_TYPE = 'event_type';
const RESULT = 'result';
const AUDIO_OUT = 'audio_out';

var conversation_State = Buffer.alloc(0);


var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]'; NOTE THIS IS A COMPLETELY OPTIONAL STEP WHICH MAY CAUSE MORE ISSUES THAN IT SOLVES IF YOU DON'T KNOW WHAT YOU ARE DOING


var handlers = {
    
    'LaunchRequest': function () {
        
        
        
        
        
        
        if (!CLIENT_ID){
            this.emit(':tell','ERROR! Client ID is not set in Lambda Environment Variables','ERROR! Client ID is not set in Lambda Environment Variables')
        }
        if (!CLIENT_SECRET){
            this.emit(':tell','ERROR! Client Secret is not set in Lambda Environment Variables','ERROR! Client Secret is not set in Lambda Environment Variables')
        }
        if (!REDIRECT_URL){
            this.emit(':tell','ERROR! Redirect URL is not set in Lambda Environment Variables','ERROR! Redirect URL is not set in Lambda Environment Variables')
        }
        if (!API_ENDPOINT){
            this.emit(':tell','ERROR! API endpoint is not set in Lambda Environment Variables','ERROR! API Endpoint is not set in Lambda Environment Variables')
        }
        
        if (!this.event.session.user.accessToken) {
            
                      
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
        
        } else {
       
       //authenticate(session.user.accessToken);
        this.emit(':ask', "How may I help?");      
        };
        
    },

    'SearchIntent': function (overrideText) {
        
        console.log('Starting Search Intent')
        
        
        // Function variables
        var setupStart = new Date().getTime();
        var encodeStart;
        var encodeTotal;
        var pollyStart
        var pollyTotal;
        var audioSendStart;
        var audioSendTotal;
        var responseWaitStart;
        var responseWaitTotal;
        var uploadStart;
        var uploadTotal;
        var setupTotal;
        var audioLength = 0;
        var searchFunction = this;
        var lastAudioTime;
        var googleUtternaceText;
        var audioPresent = false;
        

            
        // Check for required environment variables and throw spoken error if not present
        
        if (!CLIENT_ID){
            this.emit(':tell','ERROR! Client ID is not set in Lambda Environment Variables','ERROR! Client ID is not set in Lambda Environment Variables')
        }
        if (!CLIENT_SECRET){
            this.emit(':tell','ERROR! Client Secret is not set in Lambda Environment Variables','ERROR! Client Secret is not set in Lambda Environment Variables')
        }
        if (!REDIRECT_URL){
            this.emit(':tell','ERROR! Redirect URL is not set in Lambda Environment Variables','ERROR! Redirect URL is not set in Lambda Environment Variables')
        }
        if (!API_ENDPOINT){
            this.emit(':tell','ERROR! API endpoint is not set in Lambda Environment Variables','ERROR! API Endpoint is not set in Lambda Environment Variables')
        }
        if (!S3_BUCKET){
            this.emit(':tell','ERROR! S3 Bucket Name is not set in Lambda Environment Variables','ERROR! S3 Bucket Name is not set in Lambda Environment Variables')
        }

        
        // Check for optional environment variables otherwise set to defaults
        
        
        var DEBUG_MODE = process.env.DEBUG_MODE;
        
    
        var POLLY_VOICE = process.env.POLLY_VOICE;
        
        // Whilst the Assistant API is US only 'Joey' seems to to be the best option for recognition
        if (!POLLY_VOICE){
            POLLY_VOICE = 'Joey';
        }
        
        
        // Set the speed of the polly voice
        // x-slow, slow, medium, fast, x-fast
        // default is medium
        var POLLY_SPEED =  process.env.POLLY_SPEED;
        
        if (!POLLY_SPEED){
            POLLY_SPEED = 'medium';
        }
        
        
        var CHUNK_SIZE = process.env.CHUNK_SIZE;
        if (!CHUNK_SIZE){
            CHUNK_SIZE = 6000;
        }
        
        console.log('CHUNK_SIZE: ' + CHUNK_SIZE);
        
        
        // Over-ride text value recieved from Alexa with value in environment variable
        var UTTERANCE_TEXT =  process.env.UTTERANCE_TEXT
        
        if (!UTTERANCE_TEXT){
            if (overrideText){
                UTTERANCE_TEXT = overrideText;
                console.log("Utterance recieved from another intent: " + overrideText);
                
            } else {
            UTTERANCE_TEXT = this.event.request.intent.slots.search.value;
            var alexaUtteranceText_original = this.event.request.intent.slots.search.value;
            }
        } else {
            console.log('Utternace text overidden in environment variables: ' + UTTERANCE_TEXT);
        }
        // Create SSML string to send to Polly
        var alexaUtteranceText = '<speak><prosody rate="' + POLLY_SPEED + '">' + UTTERANCE_TEXT + '</prosody></speak>'
        
        console.log('Input text from Alexa is "' + alexaUtteranceText +'"');
        var ACCESS_TOKEN = this.event.session.user.accessToken;
        

   
        
        
        // Check whether we have a valid authentication token
        if (!ACCESS_TOKEN) { 
            // We haven't so cretae an account link card
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
        
        } else {
                 
            console.log('Starting Google Assistant')
            console.log(ACCESS_TOKEN);
            
            
                      
            
 
            // authenticate against OAuth using session accessToken
            
            oauth2Client.setCredentials({access_token: ACCESS_TOKEN });
            const call_creds = grpc.credentials.createFromGoogleCredential(oauth2Client);
            var channelCreds = grpc.credentials.createSsl(null);
            var combinedCreds = grpc.credentials.combineChannelCredentials(channelCreds, call_creds);
            assistant = new EmbeddedAssistantClient(API_ENDPOINT, combinedCreds);  

            const options = {};
            
            // Create new GRPC stub to communicate with Assistant API
            const conversation = assistant.converse(callCreds, options);
            
            //Deal with errors from Google API
            // These aren't necessarily all bad unless they are fatal
            conversation.on('error', err => {
              console.log('***There was a Google error**' + err);

            });
            
            conversation.on('end', () => {
                console.log('End of response from GRPC stub');
                responseWaitTotal = new Date().getTime() - responseWaitStart;
                // close resonse file which will then trigger encode
                responseFile.end();

            });
            
            // create file into which we will stream pcm response from Google
            // Closing the stream into this file will trigger encoding into MP3
            console.log ('Creating temp response file') 
            var responseFile = fs.createWriteStream("/tmp/response.pcm",{flags: 'w'},{encoding: 'buffer'});
            
            responseFile.on('finish', function () {
              console.log('temp response file has been written');
                
                const stats = fs.statSync("/tmp/response.pcm")
                const fileSizeInBytes = stats.size
                console.log('files size is '+ fileSizeInBytes)
                
                // Check whether response file has any content. If it doesn't then we have a response
                // with no audio
                if (fileSizeInBytes > 0 ){
                    // encode MP3
                    encode();
                } else {
                    // Save setting and exit
                    searchFunction.emit(':saveState', true);
                }
                
            });
            
            
            // Create Audio Configuration before we send any commands
            // We are using linear PCM as the input and output type so encoding value is 1
 
            console.log("Creating Audio config");
            console.log('Current ConversationState is');
            console.log(conversation_State);
            

            

            
            if (conversation_State.length < 1){
                console.log('No prior ConverseResponse')
                audioSetupConfig = {config: 
                        { 
                            audio_in_config: { encoding: 1, sample_rate_hertz: 16000 },
                            audio_out_config: { encoding: 2, sample_rate_hertz: 16000, volume_percentage: 100 } 
                        }
                       }
            } else {
                console.log('Prior ConverseResponse detected')
                audioSetupConfig = {config: 
                    { 
                        audio_in_config: { encoding: 1, sample_rate_hertz: 16000 },
                        audio_out_config: { encoding: 2, sample_rate_hertz: 16000, volume_percentage: 100 }, 
                        converse_state: {conversation_state: conversation_State}
                    }
                   }
            }
            
            // Send audio config to API
            conversation.write(audioSetupConfig);
            
            
            
            // Function to Split up audio part into 100ms chunks for sending to Google API in real time to simulate spoken request
            // This function is courtesy of Richard vowles https://github.com/rvowles/node-assistant
            
            
            var setupConversationAudioRequestStream = function (converseStream) {
                const audioPipe = new Stream.Writable();
                console.log('created audioPipe');

                    audioPipe._write = (chunk, enc, next) => {

                        console.log('Polly audio data recieved');

                        // Save total Polly respponse time
                        pollyTotal = new Date().getTime() - pollyStart;
                        
                        audioSendStart = new Date().getTime();

                        if (!chunk.length) {
                            console.log('ignoring');
                            return;
                        }

                        const parts = Math.ceil(chunk.length / CHUNK_SIZE);
                        console.log('chunk length is ' + chunk.length)
                        console.log("Parts = " + parts);
                        const partLength = CHUNK_SIZE/1600;    

                        audio_chunk++;
                        // Delay sending of all chunk data for this part until all previous chuncks have been sent
                        // as all chucks are a maximum of 100ms long we calculate the delay : number of chunks x previous parts x 0.1 seconds
                        wait(0.1*parts*audio_chunk, 'seconds', function() {    
                            for (let count = 0; count < parts; count++) {
                                //console.log('part: ' + count)
                                wait(0.1*count, 'seconds', function() {
                                    //console.log('sending timed data');
                                    sendTimedData (chunk, CHUNK_SIZE, count, converseStream);
                                });
                            }
                        })
                        next();
                };
                audioPipe.on('end', () => {
                    console.log('end of audio');
                    converseStream.end();
                });
                return audioPipe;
            }
            
            // Save total setup time in milliseconds
            setupTotal = new Date().getTime() - setupStart;
            

            // Google Assistant API does not accept text input        
            // So we convert Alexa result text to audio stream using AWS Polly
            
            pollyStart = new Date().getTime();
            const audioRequestStream = setupConversationAudioRequestStream(conversation);
            audio_chunk = -1;
            
            // sendingAudio variable is used to track as to whether we should keep sending utterance audio to API
            // This will be set to FALSE once "END_OF_UTTERANCE" message is recieved from Google API
            sendingAudio = true;
            
            const params = {
                                'Text': alexaUtteranceText,
                                'OutputFormat': 'pcm',
                                'VoiceId': POLLY_VOICE,
                                'SampleRate': '16000',
                                'TextType': 'ssml',
                            }
            var pollyAudio = Polly.synthesizeSpeech(params, (err, data) => {
                if (err) {
                    console.log('There was a polly error' + err.code)
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        // Initiate the source
                        console.log('Recieved polly audio');
                        
                        // Add 5 seconds of silence to stream - this is needed so that Assistant API can detect end of utternace event
                        var totalLength = blank_audio_long.length + data.AudioStream.length;
                        var combinedAudio = Buffer.concat([data.AudioStream, blank_audio_long] , totalLength);    
                        // convert AudioStream into a readable stream
                        var bufferStream = new Stream.PassThrough();
                        bufferStream.end(combinedAudio);
                        // Pipe into chunker for sending to Google API
                        bufferStream.pipe(audioRequestStream);
                    }
                } 
            })
            
                        // Deal with responses from API
            conversation.on('data', function(ConverseResponse) {
                //console.log(ConverseResponse);
                if (ConverseResponse.converse_response == EVENT_TYPE){

                  if (ConverseResponse.event_type ){
                      // Look for "END_OF_UTTERANCE" event
                      if (ConverseResponse.event_type == END_OF_UTTERANCE){
                          console.log('End of Utterance received')
                          // Set sendingAudio to false so that we will stop streaming audio to API
                          sendingAudio = false;
                          conversation.end();
                          audioSendTotal = new Date().getTime() - audioSendStart;
                          console.log('Audio Send Total time is ' + audioSendTotal + 'ms');
                          responseWaitStart = new Date().getTime();
                      }
                  }

                }

                // Deal with RESULTS TYPE
                else if (ConverseResponse.converse_response == RESULT){
                    console.log('Result received');
                    // check there is actually a value in result
                    if (ConverseResponse.result ){

                        if (ConverseResponse.result.spoken_request_text){
                          console.log('Request text is: '+ JSON.stringify(ConverseResponse.result.spoken_request_text));
                            googleUtternaceText = JSON.stringify(ConverseResponse.result.spoken_request_text);
                           
                        }
                        if (ConverseResponse.result.microphone_mode){
                            if (ConverseResponse.result.microphone_mode == 'CLOSE_MICROPHONE'){
                                microphoneOpen = false;
                                console.log('closing microphone');
                            } else if (ConverseResponse.result.microphone_mode == 'DIALOG_FOLLOW_ON'){
                                microphoneOpen = true;
                                console.log('keeping microphone open');
                            } 
                        }
                        if (ConverseResponse.result.conversation_state){
                            if (ConverseResponse.result.conversation_state.length > 0 ){
                                conversation_State = ConverseResponse.result.conversation_state;
                                
                                console.log('Conversation state changed');
                                console.log('Conversation state var is:')

                                
                            
                                
                            }
                        }
                    }

                }
                
                // Deal with audio data from API
 
                else if (ConverseResponse.converse_response == AUDIO_OUT){
 
                    var audio_chunk = ConverseResponse.audio_out.audio_data;
                    if (audio_chunk instanceof Buffer) {
                        audioLength = audioLength + audio_chunk.length;
                    
                        //console.log("chunk length " + audio_chunk.length)
                        // Store time that audio was recieved - this is used to check whther this is the last audio packet of response
                        // Would be nice if Assistant API told us this 
                        lastAudioTime = new Date().getTime();
                        
                        if (audioPresent == false){
                            audioPresent = true;
                            //conversation.end();
                        }
                        
                        // Total length of MP3's in alexa skills must be less than 90 seconds.
                        // The chime at the end of a microphone open response is 1 second
                        // so we must ensure total response less then 89 seconds 
                        if ( audioLength <= (16000*89*2)){
                            responseFile.write(audio_chunk);
                            //console.log("chunk length " + audio_chunk.length)
                            // Store time that audio was recieved - this is used to check whther this is the last audio packet of response
                            // Would be nice if Assistant API told us this 
                            lastAudioTime = new Date().getTime();
                            

                        } else {
                            // we won't write any more timestamps
                            console.log ('Ignoring audio data as it is longer than 89 seconds')
                                                        
                        }
                       
                    };
 
                }
 
            })
            

 
             ///////////////////////////////////////////////
            
            //               START OF FUNCTIONS           //
            
            ////////////////////////////////////////////////
            
            
 
 
            // This function sends a chunk of audio data to the Assistant API via grpc
            var sendTimedData = function (chunk, size, count, converseStream){

                // Only send the chunk if the END_of_UTTERANCE command hasn't been received
                if (sendingAudio == true){
                    //console.log('sending to API');
                    const converseRequest = new embedded_assistant.ConverseRequest();
                    const end = ((count + 1) * size) > chunk.length ? chunk.length : ((count + 1) * size);
                    const bit = new Uint8Array(chunk.slice(count * size, end));
                    converseRequest.setAudioIn(bit);
                    try {
                         converseStream.write(converseRequest);
                    }
                    catch (err) {
                        console.error(err);
                    }
                } else {
                    console.log('End of utterance recieved - not sending data');
                }

            }

            // This function take the response fromt the API and re-encodes using LAME
            // There is lots of reading and writing from temp files which isn't ideal
            // but I couldn't get piping to/from LAME work reliably in Lambda

            var encode = function () {

                console.log('Starting Transcode');
                
                encodeStart = new Date().getTime();

                // Read the linear PCM response from file and create stream
                var readpcm = fs.createReadStream('/tmp/response.pcm');
                readpcm.on('end', function () {  
                    console.log('pcm stream read complete')
                });
                // Create file to which MP3 will be written
                var writemp3 = fs.createWriteStream('/tmp/response.mp3');

                // Log when MP3 file is written
                writemp3.on('finish', function () {
                  console.log('mp3 has been written');
                })

                // Create LAME encoder instance
                
                var encoder = new lame.Encoder({
                      // input
                      channels: 1,        // 2 channels (left and right)
                      bitDepth: 16,       // 16-bit samples
                      sampleRate: 16000,  // 16,000 Hz sample rate

                      // output
                      bitRate: 48,
                      outSampleRate: 16000,
                      mode: lame.STEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
                    }); 
                
                var decoder = new lame.Decoder();
                decoder.on('format', onFormat);
                
                function onFormat (format) {
                  console.error('MP3 format: %j', format);

                  decoder.pipe(encoder);
                }

                // Create function to upload MP3 file to S3 
                function uploadFromStream(s3) {
                    var pass = new Stream.PassThrough();
                    var params = {Bucket: S3_BUCKET, Key: 'mp3/response.mp3', Body: pass, ACL:'public-read'};
                    s3.upload(params, function(err, data) {
                        if (err){
                        console.log('S3 upload error: ' + err) 
                            searchFunction.emit(':tell', 'There was an error uploading to S3. Please ensure that the S3 Bucket name is correct in the environment variables');
                            
                        } else{
                            // Upload has been sucessfull - we can know issue an alexa response based upon microphone state
                            uploadTotal = new Date().getTime() - uploadStart;
                            
                            var cardContent = 
                                '*********************************************************************************\n' +
                                'DEBUG INFORMATION - Delete "DEBUG_MODE" environment variable to disable this card\n' +
                                '*********************************************************************************\n' +
                                'Skill Version:         ' + VERSION_NUMBER + '\n\n' +
                                'Alexa heard:           ' + alexaUtteranceText_original + '\n' +
                                'Google assisant heard: ' + googleUtternaceText + '\n' +
                                'Polly voice was:       ' + POLLY_VOICE + '\n' +
                                'Polly Speed was:       ' + POLLY_SPEED + '\n' +
                                'Audio chunk size was:  ' + CHUNK_SIZE + '\n' +
                                '*******************************PROCESSING TIMES**********************************\n' +
                                'Setup Total time was:           ' + setupTotal + 'ms\n' + 
                                'Polly Total time was:           ' + pollyTotal + 'ms\n' +
                                'Audio Total Send Time was:      ' + audioSendTotal + 'ms\n' +
                                'Response Wait time was:         ' + responseWaitTotal + 'ms\n' +
                                'Encode Total time was:          ' + encodeTotal + 'ms\n' +
                                'Total Upload time was:          ' + uploadTotal + 'ms\n\n\n' 
                            
                            console.log(cardContent);
                            var cardTitle = 'Google Assistant Debug'
                            var speech = new Speech();
                            speech.audio('https://s3-eu-west-1.amazonaws.com/' + S3_BUCKET + '/mp3/response.mp3'); 
                            // If API has requested Microphone to stay open then will create an Alexa 'Ask' response
                            if (microphoneOpen == true){
                                console.log('Microphone is open so keeping session open')
                                speech.pause('500ms');
                                speech.audio('https://s3-eu-west-1.amazonaws.com/' + S3_BUCKET + '/mp3/chime.mp3');
                                var speechOutput = speech.ssml(true);
                                console.log('Total runtime: ' + (new Date().getTime() - setupStart) );
                                cardContent = cardContent + ('Total runtime: ' + (new Date().getTime() - setupStart) + 
                                '\nMore detailed debug information can be found in the Cloud Watch logs' );
                                //
                                if (DEBUG_MODE){
                                    
                                    searchFunction.emit(':askWithCard', speechOutput, cardTitle, cardContent);
                                } 
                                else {
                                    searchFunction.emit(':ask', speechOutput);    
                                }
                            // Otherwise we create an Alexa 'Tell' command which will close the session
                            } else{
                                console.log('Microphone is closed so closing session')
                                var speechOutput = speech.ssml(true);
                                console.log('Total runtime: ' + (new Date().getTime() - setupStart) );
                                cardContent = cardContent + ('Total runtime: ' + (new Date().getTime() - setupStart) +
                                '\nMore detailed debug information can be found in the Cloud Watch logs' );
                                if (DEBUG_MODE){
                                    
                                    searchFunction.emit(':tellWithCard', speechOutput, cardTitle, cardContent);
                                } 
                                else {
                                searchFunction.emit(':tell', speechOutput);
                                }
                            }

                      }
                    });
                    return pass;
                }

                // When encoding of MP3 has finished we upload the result to S3
                encoder.on('finish', function () {
                    encodeTotal = new Date().getTime() - encodeStart;
                    console.log('Encode Total time is ' + encodeTotal + 'ms');
                    uploadStart = new Date().getTime();
                    // Close the MP3 file
                    writemp3.end();
                    console.error('Encoding done!');
                    console.error('Streaming mp3 file to s3');
                    // Create read stream from MP3 file
                    var readmp3 = fs.createReadStream('/tmp/response.mp3');
                    // Pipe to S3 upload function
                    readmp3.pipe(uploadFromStream(s3));
                });        

                // Pipe output of PCM file reader to LAME encoder
                readpcm.pipe(decoder);

                // Pipe output of LAME encoder into MP3 file writer
                encoder.pipe(writemp3);

            }




     /// end of else /////       
       
          
        };
    
    
    },
    
    'Unhandled': function() {
        
        var message = 'Unhandled';
        var message = 'stop';
        this.emit('SearchIntent', message);
    },
    
    'AMAZON.StopIntent' : function () {
        console.log('Stop Intent')
        var message = 'stop';
        this.emit('SearchIntent', message);
        
            
    },
    'AMAZON.CancelIntent' : function () {
        console.log('Cancel Intent')
        var message = 'cancel';
        this.emit('SearchIntent', message);
    },
        
    
    'SessionEndedRequest': function () {
        console.log('session ended!');
        
        var params = {Bucket: S3_BUCKET, Key: 'mp3/response.mp3'};
        s3.deleteObject(params, function(err, data) {
          if (err) console.log('S3 deletion error ', err.stack);  // error
          else     console.log('Response mp3 deleted');                 // deleted
        });
        
        // save all settings
        //this.emit(':saveState', true);
        
    }
};


exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    // Create DynamoDB Table
    //alexa.dynamoDBTableName = 'AlexaAssistantSettings';
    alexa.execute();
};




