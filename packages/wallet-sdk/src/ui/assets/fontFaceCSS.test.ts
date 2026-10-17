import { describe, expect, it } from 'vitest';
import { FONT_FACE_CSS } from './fontFaceCSS.js';

describe('FONT_FACE_CSS', () => {
  it('is defined and is a string', () => {
    expect(FONT_FACE_CSS).toBeDefined();
    expect(typeof FONT_FACE_CSS).toBe('string');
  });

  it('contains @font-face declaration', () => {
    expect(FONT_FACE_CSS).toContain('@font-face');
  });

  it('specifies BaseSans-Regular font family', () => {
    expect(FONT_FACE_CSS).toContain('font-family: "BaseSans-Regular"');
  });

  it('includes base64 encoded font data', () => {
    expect(FONT_FACE_CSS).toContain('src: url("data:font/woff2;charset=utf-8;base64,');
    expect(FONT_FACE_CSS).toContain('format("woff2")');
  });

  it('sets font-weight to normal', () => {
    expect(FONT_FACE_CSS).toContain('font-weight: normal');
  });

  it('sets font-style to normal', () => {
    expect(FONT_FACE_CSS).toContain('font-style: normal');
  });

  it('sets font-display to swap', () => {
    expect(FONT_FACE_CSS).toContain('font-display: swap');
  });
});
