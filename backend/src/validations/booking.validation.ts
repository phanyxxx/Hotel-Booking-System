import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const validateBooking = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { CheckInDate, CheckOutDate, rooms, TotalAmount } = req.body;

  if (!CheckInDate || !CheckOutDate) {
    return next(new AppError('Check-in and check-out dates are required', 400));
  }

  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return next(new AppError('At least one room is required', 400));
  }

  const checkIn = new Date(CheckInDate);
  const checkOut = new Date(CheckOutDate);

  if (checkIn >= checkOut) {
    return next(new AppError('Check-out must be after check-in', 400));
  }

  if (checkIn < new Date()) {
    return next(new AppError('Check-in cannot be in the past', 400));
  }

  if (!TotalAmount || TotalAmount <= 0) {
    return next(new AppError('Valid total amount is required', 400));
  }

  next();
};