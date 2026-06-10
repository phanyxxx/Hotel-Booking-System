import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response.util';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  // AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  // Prisma Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate field value';
      code = 'DUPLICATE_ERROR';
    }
    
    if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      code = 'NOT_FOUND';
    }
  }

  console.error(`[ERROR] ${statusCode} - ${message}`, err);

  res.status(statusCode).json(sendError(message, code));
};