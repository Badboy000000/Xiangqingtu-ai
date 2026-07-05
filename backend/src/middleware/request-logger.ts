import { Request, Response, NextFunction } from 'express';

let firstRequestFired = false;
let firstRequestCb: (() => void) | null = null;

export function setFirstRequestCallback(cb: () => void) {
  firstRequestCb = cb;
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  if (!firstRequestFired && firstRequestCb) {
    firstRequestFired = true;
    firstRequestCb();
    firstRequestCb = null;
  }

  const start = Date.now();
  const { method, originalUrl } = req;

  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${method}] ${originalUrl} - ${_res.statusCode} (${duration}ms)`);
  });

  next();
}
