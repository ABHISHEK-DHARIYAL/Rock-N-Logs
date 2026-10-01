import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sendError } from "./apiError";

/** Wraps an async route so any thrown error goes through `sendError`. */
export function handle(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => sendError(res, error));
  };
}
