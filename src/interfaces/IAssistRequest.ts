export interface IDeviceLocation {
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface IDialogStateIn {
  language_code: string;
  device_location?: IDeviceLocation;
  is_new_conversation: boolean;
  conversation_state?: Buffer;
}

export interface IAudioOutConfig {
  encoding: number;
  volume_percentage: number;
  sample_rate_hertz: number;
}

export interface IDeviceConfig {
  device_id: string;
  device_model_id: string;
}

export interface IAssistConfig {
  text_query: string;
  audio_out_config: IAudioOutConfig;
  dialog_state_in: IDialogStateIn;
  device_config: IDeviceConfig;
}

export interface IAssistRequest {
  config: IAssistConfig;
}
