const axios = require('axios');
const Storage = require('./storage');

const PROJECT_ID = process.env.PROJECT_ID;
const API_ENDPOINT = process.env.API_ENDPOINT;

class Project {
    requestEnvelope;
    attributesManager;
    storage;

    constructor(requestEnvelope, attributesManager) {
        this.requestEnvelope = requestEnvelope;
        this.attributesManager = attributesManager;
        this.storage = new Storage(attributesManager);
    }

    registerModel(callback) {
        const registrationModelURL = `https://${API_ENDPOINT}/v1alpha2/projects/${PROJECT_ID}/deviceModels/`;
        const bearer = `Bearer ${this.requestEnvelope.context.System.user.accessToken}`;
        const deviceModel = {
            project_id: PROJECT_ID,
            device_model_id: PROJECT_ID,
            manifest: {
                manufacturer: 'Assistant SDK developer',
                product_name: 'Alexa Assistant v1',
                device_description: 'Alexa Assistant Skill v1',
            },
            device_type: 'action.devices.types.LIGHT',
            traits: ['action.devices.traits.OnOff'],
        };

        console.log('[Project.registerModel] Starting register model');

        axios({
            url: registrationModelURL,
            method: 'POST',
            headers: {
                'Authorization': bearer,
                'Content-Type': 'application/json',
            },
            data: deviceModel,
            responseType: 'json',
        }).then((bodyJSON) => {
            console.log('[Project.registerModel] Register model complete', bodyJSON);
            callback(null, bodyJSON.data);
        }).catch((error) => {
            console.error('[Project.registerModel] Register model error', error);

            if (error.response.status === 409) {
                console.error('[Project.registerModel] Model already exists');
                callback(null, error.response.data);
            } else {
                callback(error, null);
            }
        });
    }

    registerInstance(callback) {
        const registrationInstanceURL = `https://${API_ENDPOINT}/v1alpha2/projects/${PROJECT_ID}/devices/`;
        const bearer = `Bearer ${this.requestEnvelope.context.System.user.accessToken}`;
        const instanceModel = {
            id: PROJECT_ID,
            model_id: PROJECT_ID,
            nickname: 'Alexa Assistant v1',
            clientType: 'SDK_SERVICE',
        };

        console.log('[Project.registerInstance] Starting register instance');

        axios({
            url: registrationInstanceURL,
            method: 'POST',
            headers: {
                'Authorization': bearer,
                'Content-Type': 'application/json',
            },
            data: instanceModel,
            responseType: 'json',
        }).then((bodyJSON) => {
            console.log('[Project.registerInstance] Register instance complete', bodyJSON);
            callback(null, bodyJSON.data);
        }).catch((error) => {
            console.error('[Project.registerInstance] Register instance error', error);

            if (error.response.status === 409) {
                console.error('[Project.registerInstance] Instance already exists');
                callback(null, error.response.data);
            } else {
                callback(error, null);
            }
        });
    }

    async registerProject() {
        console.log('[Project.registerProject] Project registration started');

        return new Promise((resolve, reject) => {
            this.storage.loadAttributes((err, dbAttributes) => {
                if (err) {
                    console.error('[Project.registerProject] Get attributes error', err);
                    return reject(new Error('There was an error when loading the attributes'));
                } else {
                    console.log('Got positive attributes response', dbAttributes);

                    if (dbAttributes['registered']) {
                        console.warn('[Project.registerProject] Project is already registered');
                        return resolve();
                    }

                    // let's register the model and instance - we only need to do this once
                    this.registerModel((err, model) => {
                        if (err) {
                            console.error('[Project.registerProject] Got register model error', err);
                            return reject(new Error('There was an error registering the Model with the Google API'));
                        } else if (model) {
                            console.log('[Project.registerProject] Got positive model response', model);

                            this.registerInstance((err) => {
                                if (err) {
                                    console.error('[Project.registerProject] Got register instance error', err);
                                    return reject(new Error('There was an error registering the Instance with the Google API'));
                                }

                                console.log('[Project.registerProject] Got positive Instance response');

                                const attributes = this.attributesManager.getRequestAttributes();
                                attributes['microphone_open'] = false;

                                // Mark as registered
                                dbAttributes['registered'] = true;

                                this.storage.saveAttributes((err) => {
                                    if (err) {
                                        console.error('[Project.registerProject] Got save attributes error', err);
                                        return reject(new Error('There was an error when saving the attributes'));
                                    } else {
                                        console.log('[Project.registerProject] Save attributes complete');
                                        return resolve();
                                    }
                                });
                            });
                        }
                    });
                }
            });
        });
    }
}

module.exports = Project;
