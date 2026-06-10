import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';
import { generateToken } from '../utils/jwt.util';

export const authController = {
  // Register new user (Customer)
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { FullName, Email, Phone, Password, PassportOrId } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { Email },
      });

      if (existingUser) {
        throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(Password, 10);

      // Get Customer role ID (RoleID = 3 for Guest)
      const customerRole = await prisma.role.findFirst({
        where: { RoleName: 'Guest' },
      });

      if (!customerRole) {
        throw new AppError('Role not found', 500, 'ROLE_NOT_FOUND');
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          FullName,
          Email,
          Phone,
          Password: hashedPassword,
          PassportOrId,
          RoleID: customerRole.RoleID,
          Status: 1,
        },
        include: {
          role: true,
        },
      });

      // Generate token
      const token = generateToken({
        UserID: user.UserID,
        Email: user.Email,
        RoleID: user.RoleID,
      });

      // Remove password from response
      const { Password: _, ...userWithoutPassword } = user;

      res.status(201).json(sendSuccess({
        user: userWithoutPassword,
        token,
      }, 'Registration successful'));
    } catch (error) {
      next(error);
    }
  },

  // Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { Email, Password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { Email },
        include: { role: true },
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(Password, user.Password);

      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Check if account is active
      if (user.Status !== 1) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
      }

      // Generate token
      const token = generateToken({
        UserID: user.UserID,
        Email: user.Email,
        RoleID: user.RoleID,
      });

      // Remove password
      const { Password: _, ...userWithoutPassword } = user;

      res.status(200).json(sendSuccess({
        user: userWithoutPassword,
        token,
      }, 'Login successful'));
    } catch (error) {
      next(error);
    }
  },

  // Change password
  async changePassword(req: any, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.UserID;

      const user = await prisma.user.findUnique({
        where: { UserID: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.Password);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { UserID: userId },
        data: { Password: hashedPassword },
      });

      res.status(200).json(sendSuccess(null, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get current user profile
  async getMe(req: any, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { UserID: req.user.UserID },
        include: {
          role: true,
          bookings: {
            include: {
              bookingDetails: {
                include: { room: true },
              },
              payments: true,
            },
            orderBy: { CreatedAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const { Password: _, ...userWithoutPassword } = user;

      res.status(200).json(sendSuccess(userWithoutPassword));
    } catch (error) {
      next(error);
    }
  },
};