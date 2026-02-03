import { AttributesManager } from 'ask-sdk-core';
import { RequestEnvelope, services } from 'ask-sdk-model';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IAddress {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  countryCode?: string;
  formatted: string;
}

export interface ILocationResult {
  coordinates: ICoordinates;
  source: 'alexa_geolocation' | 'alexa_address' | 'google_profile' | 'user_preference';
  address?: IAddress;
}

export interface ILocationDependencies {
  requestEnvelope: RequestEnvelope;
  attributesManager: AttributesManager;
  serviceClientFactory?: services.ServiceClientFactory;
}

export interface ILocation {
  getLocation(): Promise<ILocationResult | null>;
  geocodeAddress(address: string): Promise<ICoordinates | null>;
  reverseGeocode(coordinates: ICoordinates): Promise<IAddress | null>;
  saveUserLocation(coordinates: ICoordinates): Promise<void>;
}
