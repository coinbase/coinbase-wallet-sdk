// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Brotli compression wrapper - Browser version
 * Handles compression and decompression with flag byte prefix
 * Uses brotli-wasm only (no Node.js dependencies)
 */

const COMPRESSION_FLAG_NONE = 0x00;
const COMPRESSION_FLAG_BROTLI = 0x01;

type BrotliModule = {
  compress: (data: Uint8Array, options?: { quality?: number; lgwin?: number }) => Uint8Array;
  decompress: (data: Uint8Array) => Uint8Array;
};

let brotliModule: BrotliModule | null = null;

/**
 * Initialize brotli module (idempotent)
 * Browser version - uses brotli-wasm
 */
async function ensureBrotliInitialized(): Promise<void> {
  if (!brotliModule) {
    try {
      const brotliPromise = await import('brotli-wasm');
      brotliModule = (await brotliPromise.default) as BrotliModule;
    } catch (error) {
      throw new Error(
        `Failed to initialize brotli-wasm: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }
}

/**
 * Compress payload with Brotli if beneficial
 * @param data - Data to compress
 * @returns Object with compressed data and flag byte
 */
export async function compressPayload(
  data: Uint8Array
): Promise<{ compressed: Uint8Array; flag: 0x00 | 0x01 }> {
  await ensureBrotliInitialized();

  if (!brotliModule) {
    throw new Error('Brotli module not initialized');
  }

  // Try Brotli compression (quality 5, window 22 bits per spec)
  const compressed = brotliModule.compress(data, {
    quality: 5,
    lgwin: 22, // 22 bits = 4 MB window
  });

  // Only use compression if it's actually smaller (including the flag byte)
  if (compressed.length + 1 < data.length + 1) {
    return {
      compressed,
      flag: COMPRESSION_FLAG_BROTLI,
    };
  }

  // No compression is better
  return {
    compressed: data,
    flag: COMPRESSION_FLAG_NONE,
  };
}

/**
 * Decompress payload based on flag byte
 * @param data - Data with flag byte prefix
 * @returns Decompressed data
 * @throws Error if compression flag is unknown or decompression fails
 */
export async function decompressPayload(data: Uint8Array): Promise<Uint8Array> {
  if (data.length === 0) {
    throw new Error('Cannot decompress empty payload');
  }

  const flag = data[0];
  const payload = data.slice(1);

  if (flag === COMPRESSION_FLAG_NONE) {
    return payload;
  }

  if (flag === COMPRESSION_FLAG_BROTLI) {
    await ensureBrotliInitialized();

    if (!brotliModule) {
      throw new Error('Brotli module not initialized');
    }

    try {
      const decompressed = brotliModule.decompress(payload);
      return decompressed;
    } catch (error) {
      throw new Error(
        `Brotli decompression failed: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  throw new Error(`Unknown compression flag: 0x${flag.toString(16).padStart(2, '0')}`);
}
