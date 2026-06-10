import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const roleController = {
  // Create role
  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { RoleName, Description } = req.body;

      const role = await prisma.role.create({
        data: { RoleName, Description },
      });

      res.status(201).json(sendSuccess(role, 'Role created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get all roles
  async getAllRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await prisma.role.findMany();
      res.status(200).json(sendSuccess(roles));
    } catch (error) {
      next(error);
    }
  },

  // Create default roles
  async createDefaultRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const defaultRoles = [
        { RoleName: 'Admin', Description: 'Full system access' },
        { RoleName: 'Staff', Description: 'Hotel staff' },
        { RoleName: 'Guest', Description: 'Regular customer' },
      ];

      let createdCount = 0;
      for (const role of defaultRoles) {
        const existing = await prisma.role.findFirst({
          where: { RoleName: role.RoleName },
        });
        
        if (!existing) {
          await prisma.role.create({ data: role });
          createdCount++;
        }
      }

      res.status(200).json(sendSuccess(
        { created: createdCount, total: defaultRoles.length },
        `${createdCount} roles created successfully`
      ));
    } catch (error) {
      next(error);
    }
  },
};