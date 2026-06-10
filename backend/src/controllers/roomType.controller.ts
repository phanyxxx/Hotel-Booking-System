import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const roomTypeController = {
  // Get all room types
  async getAllRoomTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const roomTypes = await prisma.roomType.findMany({
        include: {
          rooms: {
            where: { Status: 1 },
            select: { RoomID: true, RoomNumber: true, Status: true },
          },
        },
      });

      // Add room count to each type
      const roomTypesWithCount = roomTypes.map((type) => ({
        ...type,
        availableRooms: type.rooms.length,
      }));

      res.status(200).json(sendSuccess(roomTypesWithCount));
    } catch (error) {
      next(error);
    }
  },

  // Get room type by ID
  async getRoomTypeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const roomType = await prisma.roomType.findUnique({
        where: { RoomTypeID: Number(id) },
        include: {
          rooms: {
            include: { hotel: true },
          },
        },
      });

      if (!roomType) {
        throw new AppError('Room type not found', 404, 'ROOM_TYPE_NOT_FOUND');
      }

      res.status(200).json(sendSuccess(roomType));
    } catch (error) {
      next(error);
    }
  },

  // Create room type (Admin only)
  async createRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const { TypeName, PricePerNight, Description, MaxOccupancy } = req.body;

      const roomType = await prisma.roomType.create({
        data: {
          TypeName,
          PricePerNight,
          Description,
          MaxOccupancy,
        },
      });

      res.status(201).json(sendSuccess(roomType, 'Room type created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Update room type
  async updateRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { TypeName, PricePerNight, Description, MaxOccupancy } = req.body;

      const roomType = await prisma.roomType.findUnique({
        where: { RoomTypeID: Number(id) },
      });

      if (!roomType) {
        throw new AppError('Room type not found', 404, 'ROOM_TYPE_NOT_FOUND');
      }

      const updated = await prisma.roomType.update({
        where: { RoomTypeID: Number(id) },
        data: {
          TypeName,
          PricePerNight,
          Description,
          MaxOccupancy,
        },
      });

      res.status(200).json(sendSuccess(updated, 'Room type updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete room type
  async deleteRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const roomType = await prisma.roomType.findUnique({
        where: { RoomTypeID: Number(id) },
        include: { rooms: true },
      });

      if (!roomType) {
        throw new AppError('Room type not found', 404, 'ROOM_TYPE_NOT_FOUND');
      }

      if (roomType.rooms.length > 0) {
        throw new AppError('Cannot delete room type with existing rooms', 400, 'HAS_ROOMS');
      }

      await prisma.roomType.delete({
        where: { RoomTypeID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Room type deleted successfully'));
    } catch (error) {
      next(error);
    }
  },
};