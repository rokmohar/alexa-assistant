import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { DefaultApiClient, getIntentName, getRequestType, HandlerInput, SkillBuilders } from 'ask-sdk-core';
import { Response, SessionEndedRequest, IntentRequest, ResponseEnvelope } from 'ask-sdk-model';
import { ServiceFactory } from './factories/ServiceFactory';
import { IAudioState } from './interfaces/IAudioState';
import { Logger } from './services/Logger';

const logger = Logger.getInstance();

const LaunchRequestHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Launch Request');

    if (!handlerInput.requestEnvelope.context.System.user.accessToken) {
      return handlerInput.responseBuilder
        .withLinkAccountCard()
        .speak('You must link your Google account to use this skill. Please use the link in the Alexa app to authorize your Google Account.')
        .withShouldEndSession(true)
        .getResponse();
    }

    return handlerInput.responseBuilder.speak('Welcome to Alexa Assistant').getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Session ended Request');
    logger.info(`Session has ended with reason ${(handlerInput.requestEnvelope.request as SessionEndedRequest).reason}`);

    if ((handlerInput.requestEnvelope.request as SessionEndedRequest).error) {
      logger.error(`Session error`, { error: (handlerInput.requestEnvelope.request as SessionEndedRequest).error });
    }

    const attributes = handlerInput.attributesManager.getRequestAttributes();

    if (attributes['microphone_open']) {
      return SearchIntentHandler.handle(handlerInput, 'goodbye');
    }

    return handlerInput.responseBuilder.withShouldEndSession(true).getResponse();
  },
};

const SearchIntentHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && getIntentName(handlerInput.requestEnvelope) === 'SearchIntent';
  },
  handle: async (handlerInput: HandlerInput, overrideText?: string): Promise<Response> => {
    logger.info('Search Intent');

    const audioState: IAudioState = {
      microphoneOpen: true,
      alexaUtteranceText: '',
      googleResponseText: '',
    };

    if (overrideText) {
      audioState.alexaUtteranceText = overrideText;
      logger.info('Utterance received from another intent: ' + overrideText);
    } else {
      const slots = (handlerInput.requestEnvelope.request as IntentRequest).intent.slots;
      audioState.alexaUtteranceText = slots?.search?.value ?? '';
    }

    logger.info('Input text to be processed is "' + audioState.alexaUtteranceText + '"');
    logger.info('Starting Search Intent');

    const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
    const assistant = ServiceFactory.getInstance().createAssistant({ requestEnvelope, attributesManager, responseBuilder });

    try {
      await assistant.executeAssist(audioState);
    } catch (err) {
      logger.error('Execute assist returned error:', { error: err });
      handlerInput.responseBuilder.withShouldEndSession(true);
    }

    return handlerInput.responseBuilder.getResponse();
  },
};

const StopIntentHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Stop Intent');

    const attributes = handlerInput.attributesManager.getRequestAttributes();

    if (attributes['microphone_open']) {
      return SearchIntentHandler.handle(handlerInput, 'stop');
    }

    return handlerInput.responseBuilder.speak('Stopped').withShouldEndSession(true).getResponse();
  },
};

// Repeat for other intent handlers (HelpIntentHandler, CancelIntentHandler, etc.)

const UnhandledHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return true;
  },
  handle: (handlerInput: HandlerInput): Response => {
    logger.info('Unhandled event');
    return handlerInput.responseBuilder.reprompt("I'm not sure what you said. Can you repeat please?").getResponse();
  },
};

exports.handler = async function (event: any, context: any): Promise<ResponseEnvelope> {
  const skillBuilder = SkillBuilders.custom();

  skillBuilder.addRequestHandlers(
    LaunchRequestHandler,
    SessionEndedRequestHandler,
    SearchIntentHandler,
    StopIntentHandler,
    // Add remaining handlers here
    UnhandledHandler
  );
  skillBuilder.withApiClient(new DefaultApiClient());
  skillBuilder.withPersistenceAdapter(
    new DynamoDbPersistenceAdapter({
      tableName: 'AlexaAssistantSkillSettings',
      partitionKeyName: 'userId',
    })
  );

  const response = await skillBuilder.create().invoke(event, context);

  logger.info('Response is:', { response });

  return response;
};
