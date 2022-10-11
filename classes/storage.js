class Storage {
    attributesManager;

    constructor(attributesManager) {
        this.attributesManager = attributesManager;
    }

    async loadAttributes(callback) {
        console.log('[Storage.loadAttributes] Started load attributes');

        return this.attributesManager
            .getPersistentAttributes()
            .then((attributes) => {
                console.log('[Storage.loadAttributes] Load attributes complete');
                callback(null, attributes);
            })
            .catch((err) => {
                console.log('[Storage.loadAttributes] Got error with load attributes', err);
                callback(err, null);
            });
    }

    async saveAttributes(callback) {
        console.log('[Storage.saveAttributes] Started load attributes');

        return this.attributesManager
            .savePersistentAttributes()
            .then(() => {
                console.log('[Storage.saveAttributes] Save attributes complete');
                callback(null);
            })
            .catch((err) => {
                console.log('[Storage.saveAttributes] Got error with save attributes', err);
                callback(err);
            });
    }
}

module.exports = Storage;
