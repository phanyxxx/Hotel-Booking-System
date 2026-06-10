import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const roomController = {
  // Get all rooms with filters
  async getAllRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const { hotelId, roomTypeId, status, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

      const where: any = {};

      if (hotelId) where.HotelID = Number(hotelId);
      if (roomTypeId) where.RoomTypeID = Number(roomTypeId);
      if (status) where.Status = Number(status);
      if (minPrice || maxPrice) {
        where.Price = {};
        if (minPrice) where.Price.gte = Number(minPrice);
        if (maxPrice) where.Price.lte = Number(maxPrice);
      }

      const rooms = await prisma.room.findMany({
        where,
        include: {
          hotel: true,
          roomType: true,
          bookingDetails: {
            where: {
              CheckOutDate: { gte: new Date() },
            },
            include: { booking: true },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      const total = await prisma.room.count({ where });

      res.status(200).json(sendSuccess({
        rooms,
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

  // Get available rooms for date range
  async getAvailableRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const { checkInDate, checkOutDate, hotelId, roomTypeId } = req.query;

      if (!checkInDate || !checkOutDate) {
        throw new AppError('Check-in and check-out dates are required', 400, 'MISSING_DATES');
      }

      const checkIn = new Date(checkInDate as string);
      const checkOut = new Date(checkOutDate as string);

      // Find rooms that are NOT booked during this period
      const bookedRoomIds = await prisma.bookingDetail.findMany({
        where: {
          AND: [
            { CheckInDate: { lt: checkOut } },
            { CheckOutDate: { gt: checkIn } },
          ],
        },
        select: { RoomID: true },
      });

      const bookedIds = [...new Set(bookedRoomIds.map(b => b.RoomID))];

      const where: any = {
        Status: 1, // Available
        HotelID: hotelId ? Number(hotelId) : undefined,
        RoomTypeID: roomTypeId ? Number(roomTypeId) : undefined,
      };

      if (bookedIds.length > 0) {
        where.RoomID = { notIn: bookedIds };
      }

      const availableRooms = await prisma.room.findMany({
        where,
        include: {
          hotel: true,
          roomType: true,
        },
      });

      res.status(200).json(sendSuccess(availableRooms));
    } catch (error) {
      next(error);
    }
  },

  // Get room by ID
  async getRoomById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const room = await prisma.room.findUnique({
        where: { RoomID: Number(id) },
        include: {
          hotel: true,
          roomType: true,
          bookingDetails: {
            include: {
              booking: {
                include: { user: true, payments: true },
              },
            },
            orderBy: { CheckInDate: 'desc' },
          },
        },
      });

      if (!room) {
        throw new AppError('Room not found', 404, 'ROOM_NOT_FOUND');
      }

      res.status(200).json(sendSuccess(room));
    } catch (error) {
      next(error);
    }
  },

  // Create room (Admin/Hotel Manager)
  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { HotelID, RoomTypeID, RoomNumber, Price, Status, FloorNumber } = req.body;

      // Check if room number already exists in this hotel
      const existingRoom = await prisma.room.findFirst({
        where: {
          HotelID,
          RoomNumber,
        },
      });

      if (existingRoom) {
        throw new AppError('Room number already exists in this hotel', 400, 'ROOM_EXISTS');
      }

      const room = await prisma.room.create({
        data: {
          HotelID,
          RoomTypeID,
          RoomNumber,
          Price,
          Status: Status || 1,
          FloorNumber,
        },
        include: {
          hotel: true,
          roomType: true,
        },
      });

      res.status(201).json(sendSuccess(room, 'Room created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Update room
  async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { RoomNumber, Price, Status, FloorNumber, RoomTypeID } = req.body;

      const room = await prisma.room.findUnique({
        where: { RoomID: Number(id) },
      });

      if (!room) {
        throw new AppError('Room not found', 404, 'ROOM_NOT_FOUND');
      }

      const updated = await prisma.room.update({
        where: { RoomID: Number(id) },
        data: {
          RoomNumber,
          Price,
          Status,
          FloorNumber,
          RoomTypeID,
        },
        include: {
          hotel: true,
          roomType: true,
        },
      });

      res.status(200).json(sendSuccess(updated, 'Room updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Update room status (for check-in/check-out)
  async updateRoomStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { Status } = req.body;

      // Status: 1=Available, 2=Occupied, 3=Cleaning, 4=Maintenance

      const room = await prisma.room.update({
        where: { RoomID: Number(id) },
        data: { Status },
      });

      res.status(200).json(sendSuccess(room, 'Room status updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete room
  async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const room = await prisma.room.findUnique({
        where: { RoomID: Number(id) },
        include: { bookingDetails: true },
      });

      if (!room) {
        throw new AppError('Room not found', 404, 'ROOM_NOT_FOUND');
      }

      if (room.bookingDetails.length > 0) {
        throw new AppError('Cannot delete room with booking history', 400, 'HAS_BOOKINGS');
      }

      await prisma.room.delete({
        where: { RoomID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Room deleted successfully'));
    } catch (error) {
      next(error);
    }
  },
};