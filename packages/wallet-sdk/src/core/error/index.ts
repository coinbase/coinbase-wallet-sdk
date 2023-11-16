import { standardErrorCodes } from './constants';
import { standardErrors } from './errors';
import { SerializedError, serializeError } from './serialize';
import { getErrorCode, getMessageFromCode } from './utils';

export { getErrorCode, getMessageFromCode, serializeError, standardErrorCodes, standardErrors };
export type ErrorType = Error | SerializedError;
export type ErrorHandler = (error?: ErrorType) => void;
