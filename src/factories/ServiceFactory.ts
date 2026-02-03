import { IAssistant, IAssistantDependencies, IAssistantConfig } from '../interfaces/IAssistant';
import { IProject, IProjectDependencies, IProjectConfig } from '../interfaces/IProject';
import { IEncoder, IEncoderDependencies } from '../interfaces/IEncoder';
import { IBucket, IBucketDependencies, IBucketConfig } from '../interfaces/IBucket';
import { IStorage, IStorageDependencies } from '../interfaces/IStorage';
import { ILocation, ILocationDependencies } from '../interfaces/ILocation';
import { ConfigService } from '../config/ConfigService';
import Assistant from '../services/Assistant';
import Project from '../services/Project';
import Encoder from '../services/Encoder';
import Bucket from '../services/Bucket';
import Storage from '../services/Storage';
import Location from '../services/Location';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private readonly config: ConfigService;

  private constructor() {
    this.config = ConfigService.getInstance();
  }

  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  public createAssistant(dependencies: Omit<IAssistantDependencies, 'locationService'> & { serviceClientFactory?: ILocationDependencies['serviceClientFactory'] }): IAssistant {
    const locationService = this.createLocation({
      requestEnvelope: dependencies.requestEnvelope,
      attributesManager: dependencies.attributesManager,
      serviceClientFactory: dependencies.serviceClientFactory,
    });

    const config: IAssistantConfig = {
      googleApiEndpoint: this.config.get('GOOGLE_API_ENDPOINT'),
      googleProjectId: this.config.get('GOOGLE_PROJECT_ID'),
      supportedLocales: this.config.get('SUPPORTED_LOCALES'),
      audioTimeout: this.config.get('AUDIO_TIMEOUT'),
    };

    return new Assistant({ ...dependencies, locationService }, config);
  }

  public createLocation(dependencies: ILocationDependencies): ILocation {
    return new Location(dependencies);
  }

  public createProject(dependencies: IProjectDependencies): IProject {
    const config: IProjectConfig = {
      googleApiEndpoint: this.config.get('GOOGLE_API_ENDPOINT'),
      googleProjectId: this.config.get('GOOGLE_PROJECT_ID'),
      deviceType: this.config.get('DEVICE_TYPE'),
    };

    return new Project(dependencies, config);
  }

  public createEncoder(dependencies: IEncoderDependencies): IEncoder {
    return new Encoder(dependencies);
  }

  public createBucket(dependencies: IBucketDependencies): IBucket {
    const config: IBucketConfig = {
      s3Bucket: this.config.get('S3_BUCKET'),
      s3Expires: this.config.get('S3_EXPIRES'),
    };

    return new Bucket(dependencies, config);
  }

  public createStorage(dependencies: IStorageDependencies): IStorage {
    return new Storage(dependencies);
  }
}
