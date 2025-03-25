import { arrayBufferToBase64Url, base64ToBase64Url } from './encoding.js';

describe('arrayBufferToBase64Url', () => {
  it('should convert an array buffer to a base64 url equivalent to using Buffer.from', () => {
    const originalBuffer = Buffer.from('hello world');
    const arrayBuffer = new Uint8Array(originalBuffer).buffer;

    const base64Url = arrayBufferToBase64Url(arrayBuffer);
    expect(base64Url).toBe(base64ToBase64Url(originalBuffer.toString('base64')));
  });
});
