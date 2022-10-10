'use strict';

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const Assistant = require('./classes/assistant');

const LaunchRequestHandler = {
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle: async (handlerInput) => {
        console.log('Launch Request');

        if (!handlerInput.requestEnvelope.context.System.user.accessToken) {
            return handlerInput.responseBuilder
                .withLinkAccountCard()
                .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.')
                .withShouldEndSession(true)
                .getResponse();
        }

        return handlerInput.responseBuilder.speak('Welcome to Alexa Assistant').getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle: (handlerInput) => {
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
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SearchIntent';
    },
    handle: async (handlerInput, overrideText) => {
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

        const assistant = new Assistant(handlerInput.requestEnvelope, handlerInput.attributesManager, handlerInput.responseBuilder);

        try {
            await assistant.executeAssist(audioState);
        } catch (err) {
            console.log('Execute assist returned error:', err);
            handlerInput.responseBuilder.withShouldEndSession(true);
        }

        return handlerInput.responseBuilder.getResponse();
    },
};

const StopIntentHandler = {
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent';
    },
    handle: (handlerInput) => {
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
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle: (handlerInput) => {
        console.log('Help Intent');
        return SearchIntentHandler.handle(handlerInput, 'What can you do');
    },
};

const CancelIntentHandler = {
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent';
    },
    handle: (handlerInput) => {
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
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
    },
    handle: (handlerInput) => {
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
    canHandle: (handlerInput) => {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
    },
    handle: (handlerInput) => {
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
    canHandle: (handlerInput) => {
        return true;
    },
    handle: (handlerInput) => {
        console.log('Unhandled event');
        return handlerInput.responseBuilder
            .reprompt('I\'m not sure what you said. Can you repeat please')
            .getResponse();
    },
};

exports.handler = async function (event, context) {
    const skillBuilder = Alexa.SkillBuilders.custom();

    skillBuilder.addRequestHandlers(
        LaunchRequestHandler,
        SessionEndedRequestHandler,
        SearchIntentHandler,
        StopIntentHandler,
        HelpIntentHandler,
        CancelIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        UnhandledHandler
    );
    skillBuilder.withApiClient(new Alexa.DefaultApiClient()); // issue?
    skillBuilder.withPersistenceAdapter(new DynamoDbPersistenceAdapter({
        tableName: 'AlexaAssistantSkillSettings',
        partitionKeyName: 'userId',
    }))

    const response = await skillBuilder.create().invoke(event, context);

    console.log('Response is:', response);

    return response;
};
