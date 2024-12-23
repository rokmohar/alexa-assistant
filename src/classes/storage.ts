import { AttributesManager } from 'ask-sdk-core';

class Storage {
  private attributesManager: AttributesManager;

  constructor(attributesManager: AttributesManager) {
    this.attributesManager = attributesManager;
  }

  async loadAttributes(callback: (error: Error | null, attributes: Record<string, any> | null) => void): Promise<void> {
    console.log('[Storage.loadAttributes] Started load attributes');

    return this.attributesManager
      .getPersistentAttributes()
      .then((attributes) => {
        console.log('[Storage.loadAttributes] Load attributes complete');
        callback(null, attributes);
      })
      .catch((error) => {
        console.log('[Storage.loadAttributes] Got error with load attributes', error);
        callback(error, null);
      });
  }

  async saveAttributes(callback: (error: Error | null) => void): Promise<void> {
    console.log('[Storage.saveAttributes] Started save attributes');

    return this.attributesManager
      .savePersistentAttributes()
      .then(() => {
        console.log('[Storage.saveAttributes] Save attributes complete');
        callback(null);
      })
      .catch((error) => {
        console.log('[Storage.saveAttributes] Got error with save attributes', error);
        callback(error);
      });
  }
}

export default Storage;
