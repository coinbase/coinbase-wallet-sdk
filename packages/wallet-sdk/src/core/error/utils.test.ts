import { standardErrorCodes } from './constants.js';
import { standardErrors } from './errors.js';
import { getMessageFromCode } from './utils.js';

describe('errors', () => {
  test('standardErrorMessage', () => {
    // default error message
    expect(getMessageFromCode(standardErrorCodes.provider.userRejectedRequest)).toEqual(
      expect.stringContaining('rejected')
    );

    // non-standard error code
    expect(getMessageFromCode(0)).toEqual('Unspecified error message.');
  });

  test('unsupportedChain error', () => {
    const errorWithoutChainID = standardErrors.provider.unsupportedChain();
    expect(errorWithoutChainID.code).toEqual(standardErrorCodes.provider.unsupportedChain);
    expect(errorWithoutChainID.message).toEqual(expect.stringContaining('Unrecognized chain ID'));
  });
});
