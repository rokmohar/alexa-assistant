class Storage {
    attributesManager;

    constructor(attributesManager) {
        this.attributesManager = attributesManager;
    }

    async loadAttributes(callback) {
        return this.attributesManager
            .getPersistentAttributes()
            .then((attributes) => {
                callback(null, attributes);
            })
            .catch((err) => {
                callback(err, null);
            });
    }

    async saveAttributes(callback) {
        return this.attributesManager
            .savePersistentAttributes()
            .then(() => {
                callback(null);
            })
            .catch((err) => {
                callback(err);
            });
    }
}

module.exports = Storage;
