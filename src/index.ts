import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';
import { DefaultApiClient, getIntentName, getRequestType, HandlerInput, SkillBuilders } from 'ask-sdk-core';
import { Response, SessionEndedRequest, IntentRequest, ResponseEnvelope } from 'ask-sdk-model';
import { ServiceFactory } from './factories/ServiceFactory';
import { ConfigService } from './config/ConfigService';
import { IAudioState } from './interfaces/IAudioState';
import { Logger } from './services/Logger';

const logger = Logger.getInstance();
const config = ConfigService.getInstance();

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

    const { requestEnvelope, attributesManager, responseBuilder, serviceClientFactory } = handlerInput;
    const assistant = ServiceFactory.getInstance().createAssistant({ requestEnvelope, attributesManager, responseBuilder, serviceClientFactory });

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

const SetLocationIntentHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && getIntentName(handlerInput.requestEnvelope) === 'SetLocationIntent';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Set Location Intent');

    const { requestEnvelope, attributesManager, responseBuilder, serviceClientFactory } = handlerInput;
    const slots = (requestEnvelope.request as IntentRequest).intent.slots;
    const addressInput = slots?.address?.value;

    if (!addressInput) {
      logger.info('No address provided');
      return responseBuilder
        .speak('Please tell me your location. For example, say "set my location to London" or "set my location to New York".')
        .reprompt('What location would you like me to save?')
        .getResponse();
    }

    logger.info('Address input received', { address: addressInput });

    const locationService = ServiceFactory.getInstance().createLocation({
      requestEnvelope,
      attributesManager,
      serviceClientFactory,
    });

    try {
      const coordinates = await locationService.geocodeAddress(addressInput);

      if (!coordinates) {
        logger.warn('Could not geocode address', { address: addressInput });
        return responseBuilder.speak(`Sorry, I couldn't find the location "${addressInput}". Please try again with a different address.`).withShouldEndSession(true).getResponse();
      }

      await locationService.saveUserLocation(coordinates);
      logger.info('Location saved successfully', { address: addressInput, coordinates });

      const resolvedAddress = await locationService.reverseGeocode(coordinates);
      const confirmationText = resolvedAddress ? resolvedAddress.formatted : addressInput;

      return responseBuilder.speak(`Your location has been saved as ${confirmationText}. I will use it for location-based requests.`).withShouldEndSession(true).getResponse();
    } catch (error) {
      logger.error('Failed to save location', { error });
      return responseBuilder.speak('Sorry, I could not save your location. Please try again later.').withShouldEndSession(true).getResponse();
    }
  },
};

const ClearLocationIntentHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && getIntentName(handlerInput.requestEnvelope) === 'ClearLocationIntent';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Clear Location Intent');

    const { attributesManager, responseBuilder } = handlerInput;

    try {
      const attributes = await attributesManager.getPersistentAttributes();
      delete attributes.userLocation;
      attributesManager.setPersistentAttributes(attributes);
      await attributesManager.savePersistentAttributes();

      logger.info('Location cleared successfully');

      return responseBuilder.speak('Your saved location has been cleared.').withShouldEndSession(true).getResponse();
    } catch (error) {
      logger.error('Failed to clear location', { error });
      return responseBuilder.speak('Sorry, I could not clear your location. Please try again later.').withShouldEndSession(true).getResponse();
    }
  },
};

const GetLocationIntentHandler = {
  canHandle: (handlerInput: HandlerInput): boolean => {
    return getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && getIntentName(handlerInput.requestEnvelope) === 'GetLocationIntent';
  },
  handle: async (handlerInput: HandlerInput): Promise<Response> => {
    logger.info('Get Location Intent');

    const { requestEnvelope, attributesManager, responseBuilder, serviceClientFactory } = handlerInput;

    const locationService = ServiceFactory.getInstance().createLocation({
      requestEnvelope,
      attributesManager,
      serviceClientFactory,
    });

    try {
      const locationResult = await locationService.getLocation();

      if (locationResult) {
        const { latitude, longitude } = locationResult.coordinates;
        const sourceText = {
          alexa_geolocation: 'your Alexa device GPS',
          alexa_address: 'your Alexa device address',
          google_profile: 'your Google account',
          user_preference: 'your saved preferences',
        }[locationResult.source];

        logger.info('Location retrieved', { source: locationResult.source, latitude, longitude });

        const address = await locationService.reverseGeocode(locationResult.coordinates);

        if (address) {
          logger.info('Address resolved', { address: address.formatted });

          return responseBuilder.speak(`Your current location is ${address.formatted}, from ${sourceText}.`).withShouldEndSession(true).getResponse();
        } else {
          return responseBuilder
            .speak(`Your current location is set to latitude ${latitude.toFixed(4)} and longitude ${longitude.toFixed(4)}, from ${sourceText}.`)
            .withShouldEndSession(true)
            .getResponse();
        }
      } else {
        logger.info('No location available');

        return responseBuilder
          .speak('I don\'t have your location. You can say "set my location to" followed by a city name, or enable location permissions in the Alexa app.')
          .withShouldEndSession(true)
          .getResponse();
      }
    } catch (error) {
      logger.error('Failed to get location', { error });
      return responseBuilder.speak('Sorry, I could not retrieve your location. Please try again later.').withShouldEndSession(true).getResponse();
    }
  },
};

const UnhandledHandler = {
  canHandle: (_handlerInput: HandlerInput): boolean => {
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
    SetLocationIntentHandler,
    GetLocationIntentHandler,
    ClearLocationIntentHandler,
    // Add remaining handlers here
    UnhandledHandler
  );
  skillBuilder.withApiClient(new DefaultApiClient());
  skillBuilder.withPersistenceAdapter(
    new DynamoDbPersistenceAdapter({
      tableName: config.get('DYNAMODB_TABLE_NAME'),
      partitionKeyName: 'userId',
    })
  );

  const response = await skillBuilder.create().invoke(event, context);

  logger.info('Response is:', { response });

  return response;
};
