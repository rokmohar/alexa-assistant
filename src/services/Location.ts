import { AttributesManager } from 'ask-sdk-core';
import { RequestEnvelope, services } from 'ask-sdk-model';
import { Logger } from './Logger';
import { ILocation, ILocationDependencies, ILocationResult, ICoordinates, IAddress } from '../interfaces/ILocation';

const GOOGLE_PEOPLE_API_URL = 'https://people.googleapis.com/v1/people/me?personFields=addresses';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

class Location implements ILocation {
  private readonly requestEnvelope: RequestEnvelope;
  private readonly attributesManager: AttributesManager;
  private readonly serviceClientFactory?: services.ServiceClientFactory;
  private readonly logger: Logger;

  constructor(dependencies: ILocationDependencies) {
    this.requestEnvelope = dependencies.requestEnvelope;
    this.attributesManager = dependencies.attributesManager;
    this.serviceClientFactory = dependencies.serviceClientFactory;
    this.logger = Logger.getInstance();
  }

  async getLocation(): Promise<ILocationResult | null> {
    // 1. User Preference
    const userLocation = await this.getUserPreferenceLocation();
    if (userLocation) {
      this.logger.info('Using user preference location');
      return { coordinates: userLocation, source: 'user_preference' };
    }

    // 2. Alexa Geolocation
    const alexaGeolocation = this.getAlexaGeolocation();
    if (alexaGeolocation) {
      this.logger.info('Using Alexa geolocation (real-time)');
      return { coordinates: alexaGeolocation, source: 'alexa_geolocation' };
    }

    // 3. Alexa Device Address API
    const alexaAddress = await this.getAlexaDeviceAddress();
    if (alexaAddress) {
      this.logger.info('Using Alexa device address');
      return { coordinates: alexaAddress, source: 'alexa_address' };
    }

    // 4. Google Profile
    const googleLocation = await this.getGoogleProfileLocation();
    if (googleLocation) {
      this.logger.info('Using Google profile location');
      return { coordinates: googleLocation, source: 'google_profile' };
    }

    this.logger.warn('No location available from any source');
    return null;
  }

  private getAlexaGeolocation(): ICoordinates | null {
    try {
      const geolocation = this.requestEnvelope.context.Geolocation;

      if (geolocation?.coordinate) {
        const { latitudeInDegrees, longitudeInDegrees } = geolocation.coordinate;

        if (latitudeInDegrees !== undefined && longitudeInDegrees !== undefined) {
          this.logger.debug('Alexa geolocation found', { lat: latitudeInDegrees, lng: longitudeInDegrees });
          return {
            latitude: latitudeInDegrees,
            longitude: longitudeInDegrees,
          };
        }
      }

      this.logger.debug('No Alexa geolocation available');
      return null;
    } catch (error) {
      this.logger.debug('Error getting Alexa geolocation', { error });
      return null;
    }
  }

  private async getAlexaDeviceAddress(): Promise<ICoordinates | null> {
    try {
      if (!this.serviceClientFactory) {
        this.logger.debug('No service client factory available for device address');
        return null;
      }

      const deviceAddressServiceClient = this.serviceClientFactory.getDeviceAddressServiceClient();
      const deviceId = this.requestEnvelope.context.System.device?.deviceId;

      if (!deviceId) {
        this.logger.debug('No device ID available');
        return null;
      }

      let address: string | null = null;

      try {
        const fullAddress = await deviceAddressServiceClient.getFullAddress(deviceId);
        this.logger.debug('Full device address retrieved', { fullAddress });

        if (fullAddress) {
          const parts = [fullAddress.addressLine1, fullAddress.city, fullAddress.stateOrRegion, fullAddress.postalCode, fullAddress.countryCode].filter(Boolean);

          if (parts.length > 0) {
            address = parts.join(', ');
          }
        }
      } catch (fullAddressError) {
        this.logger.debug('Full address not available, trying country/postal code', { error: fullAddressError });

        try {
          const countryAndPostal = await deviceAddressServiceClient.getCountryAndPostalCode(deviceId);
          this.logger.debug('Country and postal code retrieved', { countryAndPostal });

          if (countryAndPostal?.countryCode && countryAndPostal?.postalCode) {
            address = `${countryAndPostal.postalCode}, ${countryAndPostal.countryCode}`;
          }
        } catch (postalError) {
          this.logger.debug('Country/postal code not available', { error: postalError });
        }
      }

      if (address) {
        this.logger.debug('Geocoding device address', { address });
        const coordinates = await this.geocodeAddress(address);

        if (coordinates) {
          return coordinates;
        }
      }

      this.logger.debug('No Alexa device address available');
      return null;
    } catch (error) {
      this.logger.debug('Error getting Alexa device address', { error });
      return null;
    }
  }

  private async getGoogleProfileLocation(): Promise<ICoordinates | null> {
    try {
      const accessToken = this.requestEnvelope.context.System.user.accessToken;

      if (!accessToken) {
        this.logger.debug('No access token for Google location lookup');
        return null;
      }

      const response = await fetch(GOOGLE_PEOPLE_API_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.logger.debug('Google People API request failed', { status: response.status });
        return null;
      }

      const data = await response.json();
      const addresses = data.addresses;

      if (!addresses || addresses.length === 0) {
        this.logger.debug('No addresses in Google profile');
        return null;
      }

      const homeAddress = addresses.find((addr: any) => addr.type === 'home');
      const address = homeAddress || addresses[0];

      if (address.formattedValue) {
        this.logger.debug('Geocoding Google profile address', { address: address.formattedValue });
        return this.geocodeAddress(address.formattedValue);
      }

      this.logger.debug('No usable address found in Google profile');
      return null;
    } catch (error) {
      this.logger.debug('Error getting Google location', { error });
      return null;
    }
  }

  private async getUserPreferenceLocation(): Promise<ICoordinates | null> {
    try {
      const attributes = await this.attributesManager.getPersistentAttributes();

      if (attributes.userLocation) {
        const { latitude, longitude } = attributes.userLocation;

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          this.logger.debug('User preference location found', { lat: latitude, lng: longitude });
          return { latitude, longitude };
        }
      }

      this.logger.debug('No user preference location stored');
      return null;
    } catch (error) {
      this.logger.debug('Error getting user preference location', { error });
      return null;
    }
  }

  async geocodeAddress(address: string): Promise<ICoordinates | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${NOMINATIM_BASE_URL}/search?q=${encodedAddress}&format=json&limit=1`;

      this.logger.debug('Geocoding address', { address });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AlexaAssistant/1.0',
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        this.logger.debug('Nominatim geocoding request failed', { status: response.status });
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        this.logger.debug('Geocoding successful', { latitude, longitude });
        return { latitude, longitude };
      }

      this.logger.debug('Geocoding returned no results');
      return null;
    } catch (error) {
      this.logger.debug('Error geocoding address', { error });
      return null;
    }
  }

  async reverseGeocode(coordinates: ICoordinates): Promise<IAddress | null> {
    try {
      const { latitude, longitude } = coordinates;
      const url = `${NOMINATIM_BASE_URL}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

      this.logger.debug('Reverse geocoding coordinates', { latitude, longitude });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AlexaAssistant/1.0',
          'Accept-Language': 'en',
        },
      });

      if (!response.ok) {
        this.logger.debug('Nominatim reverse geocoding request failed', { status: response.status });
        return null;
      }

      const data = await response.json();

      if (data.error) {
        this.logger.debug('Nominatim returned error', { error: data.error });
        return null;
      }

      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality;
      const state = address.state || address.region;
      const country = address.country;
      const postalCode = address.postcode;
      const countryCode = address.country_code?.toUpperCase();

      const parts = [city, state, country].filter(Boolean);
      const formatted = parts.length > 0 ? parts.join(', ') : data.display_name || 'Unknown location';

      this.logger.debug('Reverse geocoding successful', { formatted });

      return {
        city,
        state,
        country,
        postalCode,
        countryCode,
        formatted,
      };
    } catch (error) {
      this.logger.debug('Error during reverse geocoding', { error });
      return null;
    }
  }

  async saveUserLocation(coordinates: ICoordinates): Promise<void> {
    try {
      const attributes = await this.attributesManager.getPersistentAttributes();

      attributes.userLocation = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        updatedAt: new Date().toISOString(),
      };

      this.attributesManager.setPersistentAttributes(attributes);
      await this.attributesManager.savePersistentAttributes();

      this.logger.info('User location saved', { coordinates });
    } catch (error) {
      this.logger.error('Error saving user location', { error });
      throw error;
    }
  }
}

export default Location;
