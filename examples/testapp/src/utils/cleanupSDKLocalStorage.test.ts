import { beforeEach, describe, expect, it } from 'vitest';
import { cleanupSDKLocalStorage } from './cleanupSDKLocalStorage';

describe('cleanupSDKLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should remove localStorage keys starting with "cbwsdk."', () => {
    localStorage.setItem('cbwsdk.key', 'value');
    localStorage.setItem('other_key', 'value');

    cleanupSDKLocalStorage();

    expect(localStorage.getItem('cbwsdk.key')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('value');
  });

  it('should remove localStorage keys starting with "-CBWSDK:"', () => {
    localStorage.setItem('-CBWSDK:key', 'value');
    localStorage.setItem('other_key', 'value');

    cleanupSDKLocalStorage();

    expect(localStorage.getItem('-CBWSDK:key')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('value');
  });

  it('should not remove keys that do not start with "cbwsdk." or "-CBWSDK:"', () => {
    localStorage.setItem('other_key1', 'value1');
    localStorage.setItem('another_key', 'value2');
    localStorage.setItem('cbw_in_middle', 'value3');

    cleanupSDKLocalStorage();

    expect(localStorage.getItem('other_key1')).toBe('value1');
    expect(localStorage.getItem('another_key')).toBe('value2');
    expect(localStorage.getItem('cbw_in_middle')).toBe('value3');
  });
});
