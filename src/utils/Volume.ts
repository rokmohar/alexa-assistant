import { Transform } from 'stream';

export class Volume extends Transform {
  private volume: number = 1;
  private multiplier: number = Math.tan(1);

  constructor(volume: number = 1) {
    super();
    this.setVolume(volume);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    // Using tangent function for volume control as per original implementation
    this.multiplier = Math.tan(this.volume);
  }

  public _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void): void {
    // Create a new Buffer for the transformed data
    const out = Buffer.alloc(chunk.length);

    // Iterate the 16bit chunks
    for (let i = 0; i < chunk.length; i += 2) {
      // Read Int16, multiply with volume multiplier and round down
      let uint = Math.floor(this.volume * chunk.readInt16LE(i));

      // Clamp values to 16-bit range
      uint = Math.min(32767, uint);
      uint = Math.max(-32767, uint);

      // Write those 2 bytes into the other buffer
      out.writeInt16LE(uint, i);
    }

    // Return the buffer with the changed values
    this.push(out);
    callback();
  }
}
