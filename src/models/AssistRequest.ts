export interface DeviceLocation {
  coordinates: {
    latitude: string;
    longitude: string;
  };
}

export interface DialogStateIn {
  language_code: string;
  device_location: DeviceLocation;
  is_new_conversation: boolean;
  conversation_state?: Buffer;
}

export interface AudioOutConfig {
  encoding: number;
  volume_percentage: number;
  sample_rate_hertz: number;
}

export interface DeviceConfig {
  device_id: string;
  device_model_id: string;
}

export interface AssistConfig {
  text_query: string;
  audio_out_config: AudioOutConfig;
  dialog_state_in: DialogStateIn;
  device_config: DeviceConfig;
}

export interface AssistRequest {
  config: AssistConfig;
}
