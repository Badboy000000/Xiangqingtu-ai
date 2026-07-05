import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Error]', err.message, err.stack);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Multer file size error
  if (err.message?.includes('File too large')) {
    return res.status(413).json({
      success: false,
      error: '文件大小超出限制',
    });
  }

  return res.status(500).json({
    success: false,
    error: '服务器内部错误',
  });
}
