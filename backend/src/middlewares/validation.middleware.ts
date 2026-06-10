import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// Generic validation for required fields
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return next(
        new AppError(
          `Missing required fields: ${missingFields.join(', ')}`,
          400,
          'MISSING_FIELDS'
        )
      );
    }

    next();
  };
};

// Validate email format
export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (req.body.Email && !emailRegex.test(req.body.Email)) {
    return next(new AppError('Invalid email format', 400, 'INVALID_EMAIL'));
  }
  
  next();
};

// Validate phone number (Cambodian format)
export const validatePhone = (req: Request, res: Response, next: NextFunction) => {
  const phoneRegex = /^(0[1-9][0-9]{7,8})$/;
  
  if (req.body.Phone && !phoneRegex.test(req.body.Phone)) {
    return next(new AppError('Invalid phone number format', 400, 'INVALID_PHONE'));
  }
  
  next();
};

// Validate password strength
export const validatePassword = (req: Request, res: Response, next: NextFunction) => {
  const password = req.body.Password || req.body.newPassword;
  
  if (password) {
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters', 400, 'WEAK_PASSWORD'));
    }
    
    // Optional: Check for complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return next(
        new AppError(
          'Password must contain uppercase, lowercase, and numbers',
          400,
          'WEAK_PASSWORD'
        )
      );
    }
  }
  
  next();
};

// Validate date format and range
export const validateDate = (fieldName: string, allowPast: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dateValue = req.body[fieldName];
    
    if (!dateValue) {
      return next();
    }
    
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      return next(new AppError(`Invalid date format for ${fieldName}`, 400, 'INVALID_DATE'));
    }
    
    if (!allowPast && date < new Date()) {
      return next(new AppError(`${fieldName} cannot be in the past`, 400, 'PAST_DATE'));
    }
    
    req.body[fieldName] = date;
    next();
  };
};

// Validate check-in/check-out dates
export const validateBookingDates = (req: Request, res: Response, next: NextFunction) => {
  const { CheckInDate, CheckOutDate } = req.body;
  
  if (!CheckInDate || !CheckOutDate) {
    return next();
  }
  
  const checkIn = new Date(CheckInDate);
  const checkOut = new Date(CheckOutDate);
  
  if (checkIn >= checkOut) {
    return next(new AppError('Check-out date must be after check-in date', 400, 'INVALID_DATES'));
  }
  
  const minCheckIn = new Date();
  minCheckIn.setDate(minCheckIn.getDate() - 1);
  
  if (checkIn < minCheckIn) {
    return next(new AppError('Check-in date cannot be in the past', 400, 'PAST_DATE'));
  }
  
  const maxStay = 365; // Maximum 365 days
  const daysDiff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > maxStay) {
    return next(new AppError(`Booking cannot exceed ${maxStay} days`, 400, 'TOO_LONG_STAY'));
  }
  
  req.body.CheckInDate = checkIn;
  req.body.CheckOutDate = checkOut;
  
  next();
};

// Validate number range
export const validateNumberRange = (field: string, min: number, max: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[field];
    
    if (value === undefined || value === null) {
      return next();
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
      return next(new AppError(`${field} must be a number`, 400, 'INVALID_NUMBER'));
    }
    
    if (num < min || num > max) {
      return next(
        new AppError(`${field} must be between ${min} and ${max}`, 400, 'OUT_OF_RANGE')
      );
    }
    
    req.body[field] = num;
    next();
  };
};

// Validate rating (1-5)
export const validateRating = validateNumberRange('Rating', 1, 5);

// Validate amount (positive)
export const validateAmount = (req: Request, res: Response, next: NextFunction) => {
  const amount = req.body.Amount || req.body.TotalAmount;
  
  if (amount !== undefined && (amount <= 0 || isNaN(amount))) {
    return next(new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT'));
  }
  
  next();
};

// Validate enum value
export const validateEnum = (field: string, allowedValues: any[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[field];
    
    if (value === undefined || value === null) {
      return next();
    }
    
    if (!allowedValues.includes(value)) {
      return next(
        new AppError(
          `${field} must be one of: ${allowedValues.join(', ')}`,
          400,
          'INVALID_VALUE'
        )
      );
    }
    
    next();
  };
};

// Validate room status
export const validateRoomStatus = validateEnum('Status', [1, 2, 3, 4]);
// 1: Available, 2: Occupied, 3: Cleaning, 4: Maintenance

// Validate booking status
export const validateBookingStatus = validateEnum('Status', [1, 2, 3, 4]);
// 1: Pending, 2: Confirmed, 3: Completed, 4: Cancelled

// Validate payment status
export const validatePaymentStatus = validateEnum('PaymentStatus', [1, 2, 3]);
// 1: Pending, 2: Paid, 3: Failed

// Validate payment method
export const validatePaymentMethod = validateEnum('PaymentMethod', [
  'cash',
  'card',
  'aba',
  'acleda',
  'wing',
  'true_money',
]);

// XSS Protection - Sanitize input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };
  
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitize(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };
  
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

// Pagination validation
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  let { page, limit } = req.query;
  
  const pageNum = page ? Math.max(1, parseInt(page as string)) : 1;
  const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit as string))) : 10;
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };
  
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        skip: number;
      };
    }
  }
};