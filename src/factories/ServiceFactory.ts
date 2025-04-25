import { IAssistant, IAssistantDependencies, IAssistantConfig } from '../interfaces/IAssistant';
import { IProject, IProjectDependencies, IProjectConfig } from '../interfaces/IProject';
import { IEncoder, IEncoderDependencies } from '../interfaces/IEncoder';
import { IBucket, IBucketDependencies } from '../interfaces/IBucket';
import { IStorage, IStorageDependencies } from '../interfaces/IStorage';
import { ConfigService } from '../config/ConfigService';
import Assistant from '../services/Assistant';
import Project from '../services/Project';
import Encoder from '../services/Encoder';
import Bucket from '../services/Bucket';
import Storage from '../services/Storage';

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

  public createAssistant(dependencies: IAssistantDependencies): IAssistant {
    const config: IAssistantConfig = {
      googleApiEndpoint: this.config.get('GOOGLE_API_ENDPOINT'),
      googleProjectId: this.config.get('GOOGLE_PROJECT_ID'),
      deviceLocation: this.config.get('DEVICE_LOCATION'),
      supportedLocales: ['en-GB', 'de-DE', 'en-AU', 'en-CA', 'en-IN', 'ja-JP'],
    };

    return new Assistant(dependencies, config);
  }

  public createProject(dependencies: IProjectDependencies): IProject {
    const config: IProjectConfig = {
      googleApiEndpoint: this.config.get('GOOGLE_API_ENDPOINT'),
      googleProjectId: this.config.get('GOOGLE_PROJECT_ID'),
    };

    return new Project(dependencies, config);
  }

  public createEncoder(dependencies: IEncoderDependencies): IEncoder {
    return new Encoder(dependencies);
  }

  public createBucket(dependencies: IBucketDependencies): IBucket {
    return new Bucket(dependencies, {
      s3Bucket: this.config.get('S3_BUCKET'),
    });
  }

  public createStorage(dependencies: IStorageDependencies): IStorage {
    return new Storage(dependencies);
  }
}
