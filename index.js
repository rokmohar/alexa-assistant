'use strict';


var Alexa = require('alexa-sdk');
var google = require('./node_modules/googleapis');
const AWS = require('aws-sdk');
var fs = require('fs');
var every = require('every-moment');
var wait = require('wait-one-moment');
const Stream = require("stream");
var lame = require('lame');
var grpc = require('grpc')
var resolve = require('path').resolve;
var volume = require('pcm-volume');
var request = require('request');
var xmlescape = require('xml-escape');


var OAuth2 = google.auth.OAuth2;



var audio_chunk = 0;



// create JSON object to hold config
var config = {};

// Load AWS credentials
const Polly = new AWS.Polly();
var s3 = new AWS.S3();

// Get Google Credentials from Evironment Variables - these are set in the Lambda function configuration

const VERSION_NUMBER = '1.1';
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URL;
var API_ENDPOINT = process.env.API_ENDPOINT;
var S3_BUCKET = process.env.S3_BUCKET;
var PROJECT_ID = process.env.PROJECT_ID;



var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// load assistant API proto and bind using grpc

const protoDescriptor = grpc.load({
  file: 'assistant/embedded/v1alpha2/embedded_assistant.proto',
  root: resolve(__dirname, 'proto')
});

const EmbeddedAssistantClient = protoDescriptor.google.assistant.embedded.v1alpha2.EmbeddedAssistant;

const embedded_assistant = protoDescriptor.google.assistant.embedded.v1alpha12


const END_OF_UTTERANCE = 'END_OF_UTTERANCE';
const EVENT_TYPE = 'event_type';
const RESULT = 'result';
const AUDIO_OUT = 'audio_out';
var locale



var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]'; NOTE THIS IS A COMPLETELY OPTIONAL STEP WHICH MAY CAUSE MORE ISSUES THAN IT SOLVES IF YOU DON'T KNOW WHAT YOU ARE DOING


// check whether the S3 bucket exisits

var main = this

function createBucket(){
    if (S3_BUCKET){

        var bucket_params = {
          Bucket: S3_BUCKET
         };
         s3.headBucket(bucket_params, function(err, data) {
           if (err) {
               console.log ('S3 Bucket does not exist - lets try and create it')
               s3.createBucket(bucket_params, function(err, data) {
                   if (err) {
                       console.log('Could not create bucket', err.stack);
                       main.emit( ':tell', 'The S3 Bucket could not be created - make sure you have set up the IAM role properly or alternatively try a different random bucket name', 'The S3 Bucket could not be created - make sure you have set up the IAM role properly or alternatively try a different random bucket name')
                   }

                   else     {
                       console.log('Bucket Created');
                   }

             });

           }
           else {
               console.log('Bucket already exists');

           }
         });

    }
}



var ID = 'test_id'

var checkEV = function (request){
    
    if (!CLIENT_ID){
            request.emit(':tell','ERROR! Client ID is not set in Lambda Environment Variables','ERROR! Client ID is not set in Lambda Environment Variables')
        }
        if (!CLIENT_SECRET){
            request.emit(':tell','ERROR! Client Secret is not set in Lambda Environment Variables','ERROR! Client Secret is not set in Lambda Environment Variables')
        }
        if (!REDIRECT_URL){
            request.emit(':tell','ERROR! Redirect URL is not set in Lambda Environment Variables','ERROR! Redirect URL is not set in Lambda Environment Variables')
        }
        if (!API_ENDPOINT){
            request.emit(':tell','ERROR! API endpoint is not set in Lambda Environment Variables','ERROR! API Endpoint is not set in Lambda Environment Variables')
        }
        if (!S3_BUCKET){
            request.emit(':tell','ERROR! S3 Bucket is not set in Lambda Environment Variables','ERROR! S3 Bucket is not set in Lambda Environment Variables')
        }
        if (!PROJECT_ID){
            request.emit(':tell','ERROR! PROJECT_ID is not set in Lambda Environment Variables','ERROR! PROJECT_ID is not set in Lambda Environment Variables')
        }
}

var setup = function (requester, callback) {

            var ACCESS_TOKEN = requester.event.session.user.accessToken;
    
            console.log('token')
            console.log(ACCESS_TOKEN)
            //create bucket
            createBucket()
            
            //authenticate against Google OAUTH2
            oauth2Client.setCredentials({access_token: ACCESS_TOKEN });
            const call_creds = grpc.credentials.createFromGoogleCredential(oauth2Client);
            var channelCreds = grpc.credentials.createSsl(null);
            var combinedCreds = grpc.credentials.combineChannelCredentials(channelCreds, call_creds);
            
            //Create Stub
            var assistant = new EmbeddedAssistantClient(API_ENDPOINT, combinedCreds);
            
            var bearer = 'Bearer ' + ACCESS_TOKEN

            var registrationModelURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + PROJECT_ID + '/deviceModels/'

            var registrationInstanceURL = 'https://embeddedassistant.googleapis.com/v1alpha2/projects/' + PROJECT_ID + '/devices/'


            // Start the request
            //Registering Model
            var registerModel = function (callback) {

                var deviceModel = {
                  "project_id": PROJECT_ID,
                  "device_model_id": PROJECT_ID,
                  "manifest": {
                    "manufacturer": "Assistant SDK developer",
                    "product_name": "Alexa Assistant v1",
                    "device_description": "Alexa Assistant Skill v1"
                  },
                  "device_type": "action.devices.types.LIGHT",
                  "traits": ["action.devices.traits.OnOff"]
                }

                var deviceModelString = JSON.stringify(deviceModel)

                var POSToptionsModel = {
                  url: registrationModelURL,
                  method: 'POST',
                  headers: {
                      'Authorization': bearer,
                      'Content-Type': 'application/json'
                     },
                    body: deviceModelString
                };

                request(POSToptionsModel, function (error, response, body) {
                    if (error){

                        callback(error, null);
                    } else if (response){
                        var bodyJSON = JSON.parse(body)
                        if (bodyJSON.error){
                            console.log('error code recieved')
                            if (bodyJSON.error.code == 409){
                                console.log('Device already exists')
                                callback (null, bodyJSON)
                            } else {
                                callback (bodyJSON, null)
                            }
                        } else {
                            callback (null, bodyJSON)
                        }

                    }
                })
            }

            //Registering instance
            var registerInstance = function (id, callback) {

                var instanceModel = {
                    "id": id,
                    "model_id": id,
                    "nickname": "Alexa Assistant v1",
                    "clientType": "SDK_SERVICE"
                  }

                var instanceModelString = JSON.stringify(instanceModel)

                var POSToptionsInstance = {
                  url: registrationInstanceURL,
                  method: 'POST',
                  headers: {
                      'Authorization': bearer,
                      'Content-Type': 'application/json'
                     },
                    body: instanceModelString
                };

                request(POSToptionsInstance, function (error, response, body) {
                    if (error){

                        callback(error, null);
                    } else if (response){
                        var bodyJSON = JSON.parse(body)
                        if (bodyJSON.error){
                            console.log('error code recieved')
                            if (bodyJSON.error.code == 409){
                                console.log('Instance already exists')
                                callback (null, bodyJSON)
                            } else {
                                callback (bodyJSON, null)
                            }
                        } else {
                            callback (null, bodyJSON)
                        }

                    }
                })
            }

            registerModel (function(err, result)  {

                if(err){
                    console.log ('Got Model register error', err)
                } else if (result){
                    console.log('Got positive model response' + result)

                    registerInstance (PROJECT_ID, function(err, result){

                        if (err){
                            console.log('Error:', err)
                            
                            callback (true, null)
                            
                        } else if (result){
                            console.log('Got positive Instance response' )
                            
                            requester.attributes['registered'] = true;
                            requester.attributes['microphone_open'] = false;
                            
                            callback (null,true)

                        }

                    })

                }

            })
        
        
    }

var handlers = {
    
    'LaunchRequest': function () {

        // Check for required environment variables and throw spoken error if not present
        
        checkEV(this)
        var launchRequest = this
        
        if (!this.event.session.user.accessToken) {
            
                      
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
        
        } else {
            
            
            if (this.attributes['registered']){
                console.log('Device already registered')
                launchRequest.emit('SearchIntent', 'Hello'); 
            } else {
                console.log('Device not registered')
               setup (this, function(err, result)  {
                   
                   if (err){
                       
                       launchRequest.emit(':tell', "Skill could not register with Google assistant API");
                   } else if (result){
                       
                       launchRequest.emit('SearchIntent', 'Hello'); 
                   }

               })
  
            }
   
        };
        
    },
    
    
    'SearchIntent': function (overrideText) {
        
        console.log('Starting Search Intent')
        
        
        // Function variables
       

        
        var audioLength = 0;
        var searchFunction = this;
        var googleResponseText = '"🔊"'
        var audioPresent = false;
        var microphoneOpen = true;
        

            
        // Check for required environment variables and throw spoken error if not present
        
        checkEV(this)
        var SearchIntent = this

        
        // Check for optional environment variables otherwise set to defaults
        
        
        var DEBUG_MODE = process.env.DEBUG_MODE;
        
        
        var conversation_State = Buffer.alloc(0);
        

        
        // See if text value recieved from Alexa is being over-ridden with value in environment variable
        var UTTERANCE_TEXT =  process.env.UTTERANCE_TEXT;
        var alexaUtteranceText;
        
        // Have we recieved an direct utterance from another intent?
        if (overrideText){
            alexaUtteranceText = overrideText;
            console.log("Utterance recieved from another intent: " + overrideText);

        } else {
        // use detected utterance  
            alexaUtteranceText = this.event.request.intent.slots.search.value;
        }
 
        
        console.log('Input text to be processed is "' + alexaUtteranceText +'"');
        var ACCESS_TOKEN = this.event.session.user.accessToken;
        

        
        // Check whether we have a valid authentication token
        if (!ACCESS_TOKEN) { 
            // We haven't so cretae an account link card
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
        
        } else {
            console.log('token')
            console.log(ACCESS_TOKEN)
            if (this.attributes['registered']){
                console.log('Device already registered')
                
                createassistant(ACCESS_TOKEN) 
            } else {
                console.log('Device not registered')
               setup (this, function(err, result)  {
                   
                   if (err){
                       
                       SearchIntent.emit(':tell', "Skill could not register with Google assistant API");
                   } else if (result){

                       createassistant(ACCESS_TOKEN)
                   }

               })
  
            }
          
    function createassistant (token){
    
            // authenticate against OAuth using session accessToken

            oauth2Client.setCredentials({access_token: token });
            const call_creds = grpc.credentials.createFromGoogleCredential(oauth2Client);
            var channelCreds = grpc.credentials.createSsl(null);
            var combinedCreds = grpc.credentials.combineChannelCredentials(channelCreds, call_creds);
            var assistant = new EmbeddedAssistantClient(API_ENDPOINT, combinedCreds); 
    
            const options = {};
            // create a timed event incase something causes the skill to stall
            // This will stop the skill from timing out
            wait(10, 'seconds', function() { 
                if (audioPresent == false){
                  searchFunction.emit(':tell',"I wasn't able to talk to Google - please try again") 
                }
                            
                        
            })
            
            // Create new GRPC stub to communicate with Assistant API
            const callCreds = new grpc.Metadata();
            const conversation = assistant.assist(callCreds, options);
            
            //Deal with errors from Google API
            
            conversation.on('error', err => {
              console.log('***There was a Google error**' + err);
                searchFunction.emit(':tell', "The Google API returned an error which was:- " + JSON.stringify(err)) 

            });
            
            conversation.on('end', () => {
                console.log('End of response from GRPC stub');
                
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

                    // have a short pause until exiting
                    
                        console.log('Emiting blank sound')
                        searchFunction.emit(':tell',"I didn't get an audio response from the Google Assistant")
                    
                }
                
            });
            
            
            // Create Audio Configuration before we send any commands
            // We are using linear PCM as the input and output type so encoding value is 1
 
            console.log("Creating Audio config");
            
            

            var setupConfigTemplate1 = {
                config: { 
                    audio_out_config: { 
                        encoding: 1, 
                        sample_rate_hertz: 16000, 
                        volume_percentage: 100  
                    },
                    dialog_state_in: {
                        language_code: 'en-US'
                    },
                    device_config: {
                        device_id: PROJECT_ID,
                        device_model_id: PROJECT_ID
                    },
                    text_query: alexaUtteranceText
                }
            }
            
            var setupConfigTemplate2 = {
                config: { 
                    audio_out_config: { 
                        encoding: 1, 
                        sample_rate_hertz: 16000, 
                        volume_percentage: 100  
                    },
                    dialog_state_in: {
                        conversation_state: conversation_State,
                        language_code: 'en-US'
                    },
                    device_config: {
                        device_id: PROJECT_ID,
                        device_model_id: PROJECT_ID
                    },
                    text_query: alexaUtteranceText
                }
            }
            
            var setupConfig = {}
            
            if (!searchFunction.attributes['CONVERSTION_STATE']){
                console.log('No prior ConverseResponse')
                 setupConfig = setupConfigTemplate1
                
            } else {
                console.log('Prior ConverseResponse detected')
                conversation_State = Buffer.from(searchFunction.attributes['CONVERSTION_STATE'])
                setupConfig = setupConfigTemplate2
                
                
            }

        console.log('Current ConversationState is ', conversation_State);
            
            
            // Send config request to API
            conversation.write(setupConfig);
    
    // Deal with responses from API
            conversation.on('data', function(ConverseResponse) {
                //console.log(ConverseResponse)
            

                // Deal with RESULTS TYPE
                
                    // check there is actually a value in result
                    if (ConverseResponse.dialog_state_out ){
                        console.log('Dialog state out recieved')
                        if (ConverseResponse.dialog_state_out.supplemental_display_text){
                            
                            googleResponseText = xmlescape(JSON.stringify(ConverseResponse.dialog_state_out.supplemental_display_text))
                          console.log('Supplemental text is: '+ googleResponseText);
                            
                           
                        }
                        if (ConverseResponse.dialog_state_out.microphone_mode){
                            if (ConverseResponse.dialog_state_out.microphone_mode == 'CLOSE_MICROPHONE'){
                                
                                microphoneOpen = false;
                                searchFunction.attributes['microphone_open'] = false
                                console.log('closing microphone');
                               
                            } else if (ConverseResponse.dialog_state_out.microphone_mode == 'DIALOG_FOLLOW_ON'){
                                microphoneOpen = true;
                                searchFunction.attributes['microphone_open'] = true
                                console.log('keeping microphone open');
                            } 
                        }
                        if (ConverseResponse.dialog_state_out.conversation_state){
                            if (ConverseResponse.dialog_state_out.conversation_state.length > 0 ){
                                conversation_State = ConverseResponse.dialog_state_out.conversation_state;
                                
                                console.log('Conversation state changed');
                                console.log('Conversation state var is:')
                                searchFunction.attributes['CONVERSTION_STATE'] = conversation_State.toString();
                                
                            }
                        }
                    }

                
                
                // Deal with audio data from API
 
                if (ConverseResponse.audio_out){
                    //console.log('audio received')
                    var audio_chunk = ConverseResponse.audio_out.audio_data;
                    if (audio_chunk instanceof Buffer) {
                        audioLength = audioLength + audio_chunk.length;
                      
                        if (audioPresent == false){
                            audioPresent = true;
                            
                        }
                        
                        // Total length of MP3's in alexa skills must be less than 90 seconds.
                        
                        if ( audioLength <= (90*16*16000/8)){  // Seconds x Bits per sample x samples per second / 8 to give bytes per second
                            responseFile.write(audio_chunk);

                        } else {
                            // we won't write any more timestamps
                            console.log ('Ignoring audio data as it is longer than 90 seconds')
                                                        
                        }
                       
                    };
 
                }
 
            })
}
            

 
             ///////////////////////////////////////////////
            
            //               START OF FUNCTIONS           //
            
            ////////////////////////////////////////////////
            
            
 
 


            // This function takes the response fromt the API and re-encodes using LAME
            // There is lots of reading and writing from temp files which isn't ideal
            // but I couldn't get piping to/from LAME work reliably in Lambda

function encode() {

    console.log('Starting Transcode');


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
        // Create read stream from MP3 file
        var readmp3 = fs.createReadStream('/tmp/response.mp3');
        // Pipe to S3 upload function
        readmp3.pipe(uploadFromStream(s3));
    })

    // Create LAME encoder instance

    var encoder = new lame.Encoder({
          // input
          channels: 1,        // 1 channels (MONO)
          bitDepth: 16,       // 16-bit samples
          sampleRate: 16000,  // 16,000 Hz sample rate

          // output
          bitRate: 48,
          outSampleRate: 16000,
          mode: lame.JOINTSTEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
        }); 

    // The output from the google assistant is much lower than Alexa so we need to apply a gain
    var vol = new volume();

    // Set volume gain on google output to be +75%
    // Any more than this then we risk major clipping
    vol.setVolume(1.75);

    // Create function to upload MP3 file to S3 
    function uploadFromStream(s3) {
        var pass = new Stream.PassThrough();
        var params = {Bucket: S3_BUCKET, Key: S3_BUCKET, Body: pass};
        s3.upload(params, function(err, data) {
            if (err){
            console.log('S3 upload error: ' + err) 
                searchFunction.emit(':tell', 'There was an error uploading to S3. Please ensure that the S3 Bucket name is correct in the environment variables and IAM permissions are set correctly');

            } else{
                // Upload has been sucessfull - we can know issue an alexa response based upon microphone state


                var signedURL;
                // create a signed URL to the MP3 that expires after 5 seconds - this should be plenty of time to allow alexa to load and cache mp3
                var signedParams = {Bucket: S3_BUCKET, Key: S3_BUCKET, Expires: 5, ResponseContentType: 'audio/mpeg'};
                s3.getSignedUrl('getObject', signedParams, function (err, url) {

                    if (url){
                        // escape out any illegal XML characters;
                        url = xmlescape(url)
                        signedURL = url;

                        
                        var cardContent = 'Request:<br/><i>' + alexaUtteranceText + '</i><br/><br/>Response:<br/>' + googleResponseText
                        // replace carriage returns with breaks
                        cardContent = cardContent.replace(/\\n/g, '<br/>');
                        // deal with any \&quot;
                        cardContent = cardContent.replace(/\\&quot;/g, '&quot;');

                        console.log(cardContent);
                        var cardTitle = 'Google Assistant for Alexa'

                        // Let remove any (playing sfx)
                        cardContent = cardContent.replace(/(\(playing sfx\))/g, '🔊');

                        var speechOutput = '<audio src="' + signedURL + '"/>'; 

                        var template = {
                            "type": "BodyTemplate1",
                            "token": "bt1",
                            "backButton": "HIDDEN",
                            "title": cardTitle,
                            "textContent": {
                                "primaryText": {
                                    "text": cardContent,
                                    "type": "RichText"
                                }
                            }
                        }

                        searchFunction.response.speak(speechOutput)

                        if (searchFunction.event.context.System.device.supportedInterfaces.Display) {
                            searchFunction.response.renderTemplate(template);

                        }


                        // If API has requested Microphone to stay open then will create an Alexa 'Ask' response
                        // We also keep the microphone on the launchintent 'Hello' request as for some reason the API closes the microphone
                        
                        if (microphoneOpen == true || alexaUtteranceText == 'Hello'){
                            console.log('Microphone is open so keeping session open')                        

                                searchFunction.response.listen(" ");
                                searchFunction.emit(':responseReady');    

                        // Otherwise we create an Alexa 'Tell' command which will close the session
                        } else{
                            console.log('Microphone is closed so closing session')

                            searchFunction.response.shouldEndSession(true)
                                searchFunction.emit(':responseReady')

                        }
                    } else {
                        searchFunction.emit(':tell', 'There was an error creating the signed URL. Please ensure that the S3 Bucket name is correct in the environment variables and IAM permissions are set correctly');
                    } 
            });



          }
        });
        return pass;
    }

    // When encoding of MP3 has finished we upload the result to S3
    encoder.on('finish', function () {

        // Close the MP3 file
        
        wait(0.1, 'seconds', function() { 
            console.error('Encoding done!');
            console.error('Streaming mp3 file to s3');    
            writemp3.end();             
                        
            })
        
        
        
    });        


    // Pipe output of PCM file reader to the gain process
    readpcm.pipe(vol);
    // pipe the pcm output of the gain process to the LAME encoder
    vol.pipe(encoder);
    // Pipe output of LAME encoder into MP3 file writer
    encoder.pipe(writemp3);

}




     /// end of else /////       
       
          
        };
    
    
    },
    
    'Unhandled': function() {
        console.log('Unhandled event');
        
        
            this.emit(':ask', "I'm not sure what you said. Can you repeat please");

    },
    
    'AMAZON.StopIntent' : function () {
        console.log('Stop Intent')
        var message = 'stop';
        if (this.attributes['microphone_open'] == true){
            this.emit('SearchIntent', message);
        }else {
            this.emit(':tell', 'Stopped');
        }
        
            
    },
    'AMAZON.HelpIntent' : function () {
        console.log('Help Intent')
        var message = 'What can you do';
        
            this.emit('SearchIntent', message);
        
            
    },
    'AMAZON.CancelIntent' : function () {
        console.log('Cancel Intent')
        var message = 'cancel';
        if (this.attributes['microphone_open'] == true){
            this.emit('SearchIntent', message);
        } else {
            this.emit(':tell', 'Cancelled');
        }
    },
    'AMAZON.NoIntent' : function () {
        console.log('No Intent')
        var message = 'no';
        if (this.attributes['microphone_open'] == true){
            this.emit('SearchIntent', message);
        }
    },
    'AMAZON.YesIntent' : function () {
        console.log('Yes Intent')
        var message = 'yes';
        if (this.attributes['microphone_open'] == true){
            this.emit('SearchIntent', message);
        }
    },
        
    
    'SessionEndedRequest': function () {
        console.log('Session ended request');
        
        console.log(`Session has ended with reason ${this.event.request.reason}`)
        
        // Google Assistant will keep the conversation thread open even if we don't give a response to an ask.
        // We need to close the conversation if an ask response is not given (which will end up here)
        // The easiset way to do this is to just send a stop command and this will close the conversation for us
        // (this is against Amazons guides but we're not submitting this!)
        var message = 'goodbye';
        if (this.attributes['microphone_open'] == true){
            this.emit('SearchIntent', message);
        }
        
    }
};


exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    locale = event.request.locale
    alexa.registerHandlers(handlers);
    //Create DynamoDB Table
    alexa.dynamoDBTableName = 'AlexaAssistantSettings';
    alexa.execute();
};




