import { createReadStream, createWriteStream } from 'fs';
import { ResponseBuilder } from 'ask-sdk-core';
import { RequestEnvelope } from 'ask-sdk-model';
import * as lame from '@flat/lame';
import Volume from 'pcm-volume';
import { AudioState } from '../models/AudioState';
import Bucket from './bucket';

class Encoder {
  private requestEnvelope: RequestEnvelope;
  private responseBuilder: ResponseBuilder;
  private bucket: Bucket;

  constructor(requestEnvelope: RequestEnvelope, responseBuilder: ResponseBuilder) {
    this.requestEnvelope = requestEnvelope;
    this.responseBuilder = responseBuilder;
    this.bucket = new Bucket(requestEnvelope, responseBuilder);
  }

  /**
   * This function takes the response from the API and re-encodes using LAME.
   * There is lots of reading and writing from temp files which isn't ideal,
   * but I couldn't get piping to/from LAME to work reliably in Lambda.
   */
  async executeEncode(audioState: AudioState): Promise<void> {
    console.log('[Encoder.executeEncode] Starting Transcode');

    return new Promise<void>((resolve, reject) => {
      const pcmFilepath = '/tmp/response.pcm';
      const mp3Filepath = pcmFilepath.replace(/\.pcm$/, '.mp3');

      // Read the linear PCM response from file and create stream
      const readPcm = createReadStream(pcmFilepath);

      readPcm.on('end', () => {
        console.log('[Encoder.executeEncode] PCM stream read complete');
      });

      readPcm.on('error', (error) => {
        console.error('[Encoder.executeEncode] Failed to read PCM stream', error);
        reject(new Error('Failed to read PCM stream.'));
      });

      // Create file to which MP3 will be written
      const writeMp3 = createWriteStream(mp3Filepath);

      writeMp3.on('finish', async () => {
        console.log('[Encoder.executeEncode] MP3 has been written');

        try {
          await this.bucket.uploadFromStream(audioState, mp3Filepath);
        } catch (err) {
          console.error('[Encoder.executeEncode] Error with upload from stream', err);
          this.responseBuilder.speak('There was an error uploading to S3');
          return reject(new Error('Error with upload from stream'));
        }

        return resolve();
      });

      writeMp3.on('error', (error) => {
        console.error('[Encoder.executeEncode] Failed to write MP3 file', error);
        return reject(new Error('Failed to write MP3 file.'));
      });

      // Create LAME encoder instance
      const encoder = lame.Encoder({
        // input
        channels: 1, // 1 channel (MONO)
        bitDepth: 16, // 16-bit samples
        sampleRate: 16000, // 16,000 Hz sample rate
        // output
        bitRate: 48,
        outSampleRate: 16000,
        mode: (lame as any).JOINTSTEREO, // STEREO (default), JOINTSTEREO, DUALCHANNEL, or MONO
      } as any);

      encoder.on('finish', () => {
        console.log('[Encoder.executeEncode] Encoding done!');
      });

      encoder.on('error', (error) => {
        console.error('[Encoder.executeEncode] Failed to encode MP3 file', error);
        return reject(new Error('Failed to encode MP3 file.'));
      });

      // The output from the Google Assistant is much lower than Alexa, so we need to apply a gain
      const volume = new Volume();

      // Set volume gain on Google output to be +75%
      // Any more than this then we risk major clipping
      volume.setVolume(1.75);

      // Pipe output of PCM file reader to the gain process
      readPcm.pipe(volume);

      // Pipe the PCM output of the gain process to the LAME encoder
      volume.pipe(encoder);

      // Pipe output of LAME encoder into MP3 file writer
      encoder.pipe(writeMp3);
    });
  }
}

export default Encoder;
