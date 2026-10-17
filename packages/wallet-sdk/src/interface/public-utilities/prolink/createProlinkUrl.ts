// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Base App universal link utilities for prolinks
 */

/**
 * Create a link with an encoded prolink query parameter and additional query parameters
 *
 * @param prolink - Base64url-encoded prolink payload
 * @param url - URL to use for the link, defaults to https://base.app/base-pay
 * @param additionalQueryParams - Additional query parameters to add to the link
 * @returns string - The full link
 *
 * @example
 * ```typescript
 * const prolink = await encodeProlink(request);
 * const link = createProlinkUrl(prolink);
 * // Returns: 'https://base.app/base-pay?p=CAEQ...'
 *
 * const linkWithAdditionalParams = createProlinkUrl(prolink, 'https://base.app/base-pay', {
 *   foo: 'bar',
 *   baz: 'qux',
 * });
 * // Returns: 'https://base.app/base-pay?p=CAEQ...&foo=bar&baz=qux'
 * ```
 */
export function createProlinkUrl(
  prolink: string,
  url: string = 'https://base.app/base-pay',
  additionalQueryParams?: Record<string, string>
): string {
  if (!prolink || prolink.trim().length === 0) {
    throw new Error('prolink cannot be empty');
  }
  if (!url || url.trim().length === 0) {
    throw new Error('url cannot be empty');
  }

  const link = new URL(url);
  link.searchParams.set('p', prolink);
  Object.entries(additionalQueryParams ?? {}).forEach(([key, value]) => {
    link.searchParams.set(key, value);
  });

  return link.toString();
}
