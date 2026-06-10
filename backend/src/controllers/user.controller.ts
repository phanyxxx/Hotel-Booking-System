import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const userController = {
  // Get all users (Admin)
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status, page = 1, limit = 10 } = req.query;

      const where: any = {};

      if (role) {
        where.role = { RoleName: role as string };
      }

      if (status) {
        where.Status = Number(status);
      }

      const users = await prisma.user.findMany({
        where,
        include: { role: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' },
      });

      // Remove passwords
      const usersWithoutPassword = users.map(({ Password, ...user }) => user);

      const total = await prisma.user.count({ where });

      res.status(200).json(sendSuccess({
        users: usersWithoutPassword,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      }));
    } catch (error) {
      next(error);
    }
  },

  // Get user by ID
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { UserID: Number(id) },
        include: {
          role: true,
          bookings: {
            include: {
              bookingDetails: { include: { room: true } },
              payments: true,
            },
          },
          reviews: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const { Password, ...userWithoutPassword } = user;

      res.status(200).json(sendSuccess(userWithoutPassword));
    } catch (error) {
      next(error);
    }
  },

  // Create user (Admin)
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { FullName, Email, Phone, Password, RoleID, PassportOrId } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { Email },
      });

      if (existingUser) {
        throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
      }

      const hashedPassword = await bcrypt.hash(Password, 10);

      const user = await prisma.user.create({
        data: {
          FullName,
          Email,
          Phone,
          Password: hashedPassword,
          RoleID,
          PassportOrId,
          Status: 1,
        },
        include: { role: true },
      });

      const { Password: _, ...userWithoutPassword } = user;

      res.status(201).json(sendSuccess(userWithoutPassword, 'User created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Update user
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { FullName, Phone, PassportOrId, Status, RoleID } = req.body;

      const user = await prisma.user.findUnique({
        where: { UserID: Number(id) },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const updatedUser = await prisma.user.update({
        where: { UserID: Number(id) },
        data: {
          FullName,
          Phone,
          PassportOrId,
          Status,
          RoleID,
        },
        include: { role: true },
      });

      const { Password, ...userWithoutPassword } = updatedUser;

      res.status(200).json(sendSuccess(userWithoutPassword, 'User updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete user (soft delete - set status to 0)
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { UserID: Number(id) },
        include: { bookings: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user has bookings
      if (user.bookings.length > 0) {
        // Soft delete - deactivate only
        await prisma.user.update({
          where: { UserID: Number(id) },
          data: { Status: 0 },
        });
        return res.status(200).json(sendSuccess(null, 'User deactivated successfully (has bookings)'));
      }

      // Hard delete if no bookings
      await prisma.user.delete({
        where: { UserID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'User deleted successfully'));
    } catch (error) {
      next(error);
    }
  },
};