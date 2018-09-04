// @flow
import { Router } from "express";
import type { $Request, $Response, Middleware, NextFunction } from "express";

export class ApiError extends Error {
  static code: string;
  static responseCode: number;

  constructor(message: string, rootError?: Error) {
    super(message);
    if (rootError != null) {
      this.stack += "\nCaused by: " + rootError.stack;
    }
  }
}

export const wrapAsync = (fn: Middleware): Middleware => {
  return function(req: $Request, res: $Response, next: NextFunction) {
    console.log("wrapping");
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    // $FlowFixMe
    fn(req, res, next).catch(next);
  };
};

// $FlowFixMe
export class TokioRouter extends Router {
  get(path: string, handler: Middleware): mixed {
    console.log();
    return null;
  }

  post(path: string, handler: Middleware): mixed {
    return super.post(path, wrapAsync(handler));
  }
}

export const apiErrorMiddleware = (): Middleware => {
  return (error: ?Error, req: $Request, res: $Response, next: NextFunction) => {
    if (error instanceof ApiError) {
      const apiError: ApiError = error;
      return res
        .status(apiError.constructor.responseCode)
        .json({ code: apiError.constructor.code, message: apiError.message });
    }
    next(error);
  };
};
