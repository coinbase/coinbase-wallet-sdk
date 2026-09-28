/**
 * Prolink Features Tests
 *
 * Tests for Prolink encoding, decoding, and URL generation functionality.
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test Prolink encoding, decoding, and URL creation
 */
export async function testProlinkEncodeDecode(
  handlers: TestHandlers,
  context: TestContext
): Promise<void> {
  const category = 'Prolink Features';

  // Check if Prolink functions are available
  if (
    !context.loadedSDK.encodeProlink ||
    !context.loadedSDK.decodeProlink ||
    !context.loadedSDK.createProlinkUrl
  ) {
    handlers.updateTestStatus(category, 'encodeProlink()', 'skipped', 'Prolink API not available');
    handlers.updateTestStatus(category, 'decodeProlink()', 'skipped', 'Prolink API not available');
    handlers.updateTestStatus(
      category,
      'createProlinkUrl()',
      'skipped',
      'Prolink API not available'
    );
    return;
  }

  // Test encoding
  const encoded = await runTest(
    {
      category,
      name: 'encodeProlink()',
      requiresSDK: true,
    },
    async (ctx) => {
      const testRequest = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1',
            from: '0x0000000000000000000000000000000000000001',
            calls: [
              {
                to: '0x0000000000000000000000000000000000000002',
                data: '0x',
                value: '0x0',
              },
            ],
            chainId: '0x2105',
          },
        ],
      };

      const encoded = await ctx.loadedSDK.encodeProlink!(testRequest);

      const details = `Length: ${encoded.length} chars, Method: ${testRequest.method}`;

      return { encoded, details };
    },
    handlers,
    context
  );

  if (!encoded) {
    return; // Encoding failed, skip remaining tests
  }

  // Extract the encoded string from the result
  const encodedString =
    typeof encoded === 'object' && 'encoded' in encoded ? encoded.encoded : encoded;

  // Test decoding
  await runTest(
    {
      category,
      name: 'decodeProlink()',
      requiresSDK: true,
    },
    async (ctx) => {
      const decoded = await ctx.loadedSDK.decodeProlink!(encodedString);

      if (decoded.method === 'wallet_sendCalls') {
        const details = `Method: ${decoded.method}, ChainId: ${decoded.chainId || 'N/A'}`;

        return { decoded, details };
      }

      throw new Error('Decoded method mismatch');
    },
    handlers,
    context
  );

  // Test URL creation
  await runTest(
    {
      category,
      name: 'createProlinkUrl()',
      requiresSDK: true,
    },
    async (ctx) => {
      const url = ctx.loadedSDK.createProlinkUrl!(encodedString);

      if (url.startsWith('https://base.app/base-pay')) {
        const details = `URL: ${url.substring(0, 50)}..., Params: ${new URL(url).searchParams.size}`;

        return { url, details };
      }

      throw new Error(`Invalid URL format: ${url}`);
    },
    handlers,
    context
  );
}
