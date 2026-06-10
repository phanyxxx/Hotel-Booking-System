import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { FullName, Email, Password, Phone } = req.body;

  if (!FullName || FullName.length < 3) {
    return next(new AppError('Full name must be at least 3 characters', 400));
  }

  if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
    return next(new AppError('Valid email is required', 400));
  }

  if (!Password || Password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  if (!Phone || Phone.length < 9) {
    return next(new AppError('Valid phone number is required', 400));
  }

  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return next(new AppError('Email and password are required', 400));
  }

  next();
};