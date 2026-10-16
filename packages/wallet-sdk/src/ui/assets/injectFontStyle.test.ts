import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FONT_FACE_CSS } from './fontFaceCSS.js';
import { injectFontStyle } from './injectFontStyle.js';

describe('injectFontStyle', () => {
  beforeEach(() => {
    // Clean up any existing font styles
    const existing = document.head.querySelectorAll('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    existing.forEach((el) => el.remove());
  });

  afterEach(() => {
    // Clean up after each test
    const existing = document.head.querySelectorAll('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    existing.forEach((el) => el.remove());
  });

  it('injects font style into document head', () => {
    injectFontStyle();

    const styleElement = document.head.querySelector('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    expect(styleElement).toBeInTheDocument();
  });

  it('sets correct attributes on style element', () => {
    injectFontStyle();

    const styleElement = document.head.querySelector('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    expect(styleElement).toHaveAttribute('cbw-sdk-font', 'CoinbaseSans-Regular');
  });

  it('includes font CSS content', () => {
    injectFontStyle();

    const styleElement = document.head.querySelector('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    expect(styleElement?.textContent).toBe(FONT_FACE_CSS);
  });

  it('does not inject duplicate styles', () => {
    // Call inject multiple times
    injectFontStyle();
    injectFontStyle();
    injectFontStyle();

    const styleElements = document.head.querySelectorAll(
      'style[cbw-sdk-font="CoinbaseSans-Regular"]'
    );
    expect(styleElements).toHaveLength(1);
  });

  it('returns early if style already exists', () => {
    // Manually add a style element first
    const existingStyle = document.createElement('style');
    existingStyle.setAttribute('cbw-sdk-font', 'CoinbaseSans-Regular');
    existingStyle.textContent = 'existing content';
    document.head.appendChild(existingStyle);

    injectFontStyle();

    const styleElements = document.head.querySelectorAll(
      'style[cbw-sdk-font="CoinbaseSans-Regular"]'
    );
    expect(styleElements).toHaveLength(1);
    expect(styleElements[0].textContent).toBe('existing content');
  });

  it('appends style to document head', () => {
    const initialChildren = document.head.children.length;

    injectFontStyle();

    expect(document.head.children.length).toBe(initialChildren + 1);

    const lastChild = document.head.children[document.head.children.length - 1];
    expect(lastChild).toHaveAttribute('cbw-sdk-font', 'CoinbaseSans-Regular');
  });

  it('creates valid CSS content', () => {
    injectFontStyle();

    const styleElement = document.head.querySelector('style[cbw-sdk-font="CoinbaseSans-Regular"]');
    const cssContent = styleElement?.textContent || '';

    // Should contain @font-face declaration
    expect(cssContent).toContain('@font-face');
    expect(cssContent).toContain('font-family: "CoinbaseSans-Regular"');
    expect(cssContent).toContain('src: url("data:font/woff2;charset=utf-8;base64,');
    expect(cssContent).toContain('font-weight: normal');
    expect(cssContent).toContain('font-style: normal');
    expect(cssContent).toContain('font-display: swap');
  });

  it('handles document head operations safely', () => {
    // Ensure this doesn't throw even if called multiple times rapidly
    expect(() => {
      for (let i = 0; i < 10; i++) {
        injectFontStyle();
      }
    }).not.toThrow();
  });
});
