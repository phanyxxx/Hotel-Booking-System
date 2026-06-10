import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    UserID: number;
    Email: string;
    RoleID: number;
    RoleName?: string;
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get token from header
    let token: string | undefined;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in', 401, 'UNAUTHORIZED');
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      UserID: number;
      Email: string;
      RoleID: number;
    };

    // 3. Check if user still exists
    const user = await prisma.user.findUnique({
      where: { UserID: decoded.UserID },
      include: { role: true },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    // 4. Attach user to request
    req.user = {
      UserID: user.UserID,
      Email: user.Email,
      RoleID: user.RoleID,
      RoleName: user.role.RoleName,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.RoleName!)) {
      return next(new AppError('You do not have permission', 403, 'FORBIDDEN'));
    }
    next();
  };
};