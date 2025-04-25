export interface IDeviceModel {
  project_id: string;
  device_model_id: string;
  manifest: {
    manufacturer: string;
    product_name: string;
    device_description: string;
  };
  device_type: string;
  traits: string[];
}
