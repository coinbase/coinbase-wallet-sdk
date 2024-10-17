import { createQrUrl, isMobileWeb } from './util.js';

describe('util', () => {
  test('isMobileWeb', () => {
    const testCases = [
      {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        expected: true,
      },
      {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.130 Mobile Safari/537.36',
        expected: true,
      },
      {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        expected: false,
      },
      {
        userAgent: undefined,
        expected: false,
      },
    ];

    testCases.forEach((testCase) => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: testCase.userAgent,
      });
      expect(isMobileWeb()).toEqual(testCase.expected);
    });
  });

  test('createQrUrl', () => {
    expect(
      createQrUrl(
        '1dc7878268586cbcaf041c6817d446d3',
        'b9a1d5933eae7064fc6e1a673235f648',
        'https://www.walletlink.org',
        false,
        '1',
        1
      )
    ).toEqual(
      'https://www.walletlink.org/#/link?id=1dc7878268586cbcaf041c6817d446d3&secret=b9a1d5933eae7064fc6e1a673235f648&server=https%3A%2F%2Fwww.walletlink.org&v=1&chainId=1'
    );
    expect(
      createQrUrl(
        '1dc7878268586cbcaf041c6817d446d3',
        'b9a1d5933eae7064fc6e1a673235f648',
        'https://www.walletlink.org',
        true,
        '1',
        1
      )
    ).toEqual(
      'https://www.walletlink.org/#/link?parent-id=1dc7878268586cbcaf041c6817d446d3&secret=b9a1d5933eae7064fc6e1a673235f648&server=https%3A%2F%2Fwww.walletlink.org&v=1&chainId=1'
    );
  });
});
