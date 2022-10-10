const fs = require('fs');
const lame = require('@suldashi/lame');
const Volume = require('pcm-volume');
const Bucket = require('./bucket');

class Encoder {
    requestEnvelope;
    responseBuilder;
    bucket;

    constructor(requestEnvelope, responseBuilder) {
        this.requestEnvelope = requestEnvelope;
        this.responseBuilder = responseBuilder;
        this.bucket = new Bucket(requestEnvelope, responseBuilder);
    }

    /**
     * This function takes the response from the API and re-encodes using LAME.
     * There is lots of reading and writing from temp files which isn't ideal,
     * but I couldn't get piping to/from LAME work reliably in Lambda
     */
    async executeEncode(audioState) {
        console.log('Starting Transcode');

        return new Promise((resolve, reject) => {
            // Read the linear PCM response from file and create stream
            const readPcm = fs.createReadStream('/tmp/response.pcm');

            readPcm.on('end', () => {
                console.log('pcm stream read complete');
            });

            // Create file to which MP3 will be written
            const writeMp3 = fs.createWriteStream('/tmp/response.mp3');

            // Log when MP3 file is written
            writeMp3.on('finish', async () => {
                console.log('mp3 has been written');

                // Create read stream from MP3 file
                const readMp3 = fs.createReadStream('/tmp/response.mp3');

                try {
                    const uploadResponse = await this.bucket.uploadFromStream(audioState);

                    // Pipe to S3 upload function
                    readMp3.pipe(uploadResponse.streamPass);

                    await uploadResponse.uploadPromise;
                } catch (err) {
                    console.error('Error with upload from stream:', err);
                    this.responseBuilder.speak('There was an error uploading to S3');
                    return reject(new Error('Error with upload from stream'));
                }

                console.log('Upload from stream complete');

                return resolve();
            });

            // Create LAME encoder instance
            const encoder = new lame.Encoder({
                // input
                channels: 1, // 1 channels (MONO)
                bitDepth: 16, // 16-bit samples
                sampleRate: 16000, // 16,000 Hz sample rate
                // output
                bitRate: 48,
                outSampleRate: 16000,
                mode: lame.JOINTSTEREO, // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
            });

            // The output from the Google Assistant is much lower than Alexa, so we need to apply a gain
            const volume = new Volume();

            // Set volume gain on Google output to be +75%
            // Any more than this then we risk major clipping
            volume.setVolume(1.75);

            // When encoding of MP3 has finished we upload the result to S3
            encoder.on('finish', () => {
                setTimeout(() => {
                    // Close the MP3 file
                    console.log('Encoding done!');
                    console.log('Streaming mp3 file to s3');
                    writeMp3.end();
                });
            });

            // Pipe output of PCM file reader to the gain process
            readPcm.pipe(volume);

            // pipe the pcm output of the gain process to the LAME encoder
            volume.pipe(encoder);

            // Pipe output of LAME encoder into MP3 file writer
            encoder.pipe(writeMp3);
        });
    }
}

module.exports = Encoder;
