import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export const rateLimit = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get key (IP address or user ID if logged in)
    const key = (req as any).user?.UserID 
      ? `user_${(req as any).user.UserID}` 
      : `ip_${req.ip}`;
    
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // Clean up old records periodically
    if (record && record.resetTime <= now) {
      rateLimitStore.delete(key);
    }

    const currentRecord = rateLimitStore.get(key);

    if (!currentRecord) {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    // Check if limit exceeded
    if (currentRecord.count >= options.maxRequests) {
      const waitTime = Math.ceil((currentRecord.resetTime - now) / 1000);
      return next(
        new AppError(
          options.message || `Too many requests, please try again in ${waitTime} seconds`,
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    // Increment counter
    currentRecord.count += 1;
    rateLimitStore.set(key, currentRecord);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', options.maxRequests - currentRecord.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(currentRecord.resetTime / 1000));

    next();
  };
};

// Specific rate limiters for different use cases
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

export const authRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many login attempts, please try again after 1 hour',
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests, please slow down',
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Too many search requests, please wait a moment',
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many payment attempts, please try again later',
});

// Clean up expired records every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);