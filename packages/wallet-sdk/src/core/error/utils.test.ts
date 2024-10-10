import { isErrorResponse, Web3Response } from '../../sign/walletlink/relay/type/Web3Response.js';
import { standardErrorCodes } from './constants.js';
import { standardErrors } from './errors.js';
import { getErrorCode, getMessageFromCode } from './utils.js';

describe('errors', () => {
  test('getErrorCode', () => {
    expect(getErrorCode(4137)).toEqual(4137);

    expect(getErrorCode({ code: 4137 })).toEqual(4137);
    expect(getErrorCode({ errorCode: 4137 })).toEqual(4137);
    expect(getErrorCode({ code: 4137, errorCode: 4137 })).toEqual(4137);

    expect(getErrorCode({ code: '4137' })).toEqual(undefined);
    expect(getErrorCode({ code: undefined })).toEqual(undefined);
    expect(getErrorCode({ errorCode: '4137' })).toEqual(undefined);
    expect(getErrorCode({ errorCode: undefined })).toEqual(undefined);

    expect(getErrorCode({})).toEqual(undefined);
    expect(getErrorCode('4137')).toEqual(undefined);
    expect(getErrorCode(new Error('generic error'))).toEqual(undefined);

    expect(getErrorCode(null)).toEqual(undefined);
    expect(getErrorCode(undefined)).toEqual(undefined);

    const errorResponse: Web3Response = {
      method: 'generic',
      errorMessage: 'test error message',
      errorCode: 4137,
    };
    expect(isErrorResponse(errorResponse)).toEqual(true);
    expect(getErrorCode(errorResponse)).toEqual(4137);
  });

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
