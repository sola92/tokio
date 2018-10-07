//@flow
import { ApiError } from "src/lib/express";

export class LockError extends Error {
  constructor(message: string, expireTime?: ?number) {
    message += `Time: ${new Date().getTime()}.`;

    if (expireTime) {
      message += ` Lock expires at: ${expireTime}`;
    }

    super(message);
  }
}

export class LockReleaseError extends LockError {}
export class LockAcquisitionError extends LockError {}

export class InvalidBalanceError extends ApiError {
  static code: string = "INVALID_BALANCE";
  static httpResponseCode: number = 400;
}

export class InvalidParameterError extends ApiError {
  static code: string = "INVALID_PARAM";
  static httpResponseCode: number = 400;
}

export class InvalidRecipientError extends ApiError {
  static code: string = "INVALID_TO";
  static httpResponseCode: number = 400;
}

export class UnknownAccountError extends ApiError {
  static code: string = "UNKNOWN_ACCOUNT";
  static httpResponseCode: number = 400;
}

export class NotFoundError extends ApiError {
  static code: string = "NOT_FOUND";
  static httpResponseCode: number = 404;
}

export class AccountBusyError extends ApiError {
  static code: string = "ACCOUNT_BUSY";
  static httpResponseCode: number = 503;
}

export class InvalidStateError extends ApiError {
  static code: string = "INVALID_STATE";
  static httpResponseCode: number = 400;
}
