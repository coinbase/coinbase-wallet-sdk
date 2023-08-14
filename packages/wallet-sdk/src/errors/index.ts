import { standardErrorCodes } from './constants.js';
import { standardErrors } from './errors.js';
import { SerializedError, serializeError } from './serialize.js';
import { getErrorCode, getMessageFromCode } from './utils.js';

export { getErrorCode, getMessageFromCode, serializeError, standardErrorCodes, standardErrors };
export type ErrorType = Error | SerializedError;
export type ErrorHandler = (error?: ErrorType) => void;
