import { enhanceRequestParams, get, getSenderFromRequest } from './utils.js';

describe('utils', () => {
  describe('get', () => {
    it('should return the value at the given path', () => {
      const obj = { a: { b: { c: 'd' } } };
      expect(get(obj, 'a.b.c')).toBe('d');
    });
  });

  describe('getSenderFromRequest', () => {
    it('should return the sender from the request', () => {
      const request = { method: 'eth_signTransaction', params: [{ from: '0x123' }] };
      expect(getSenderFromRequest(request)).toBe('0x123');
    });
  });

  describe('enhanceRequestParams', () => {
    it('should enhance the request params', () => {
      const request = { method: 'eth_signTransaction', params: [{ from: '0x123' }] };
      const sender = '0x123';
      expect(enhanceRequestParams(request, sender)).toEqual({
        method: 'eth_signTransaction',
        params: [{ from: '0x123' }],
      });
    });
  });
});
