import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const bookingController = {
  // Create new booking
  async createBooking(req: any, res: Response, next: NextFunction) {
    try {
      const {
        CheckInDate,
        CheckOutDate,
        rooms, // Array of { RoomID }
        TotalAmount,
      } = req.body;

      const userId = req.user.UserID;

      // Validate dates
      const checkIn = new Date(CheckInDate);
      const checkOut = new Date(CheckOutDate);

      if (checkIn >= checkOut) {
        throw new AppError('Check-out date must be after check-in date', 400, 'INVALID_DATES');
      }

      if (checkIn < new Date()) {
        throw new AppError('Check-in date cannot be in the past', 400, 'PAST_DATE');
      }

      // Check if rooms are available
      for (const roomItem of rooms) {
        const conflictingBooking = await prisma.bookingDetail.findFirst({
          where: {
            RoomID: roomItem.RoomID,
            AND: [
              { CheckInDate: { lt: checkOut } },
              { CheckOutDate: { gt: checkIn } },
            ],
          },
        });

        if (conflictingBooking) {
          const room = await prisma.room.findUnique({
            where: { RoomID: roomItem.RoomID },
          });
          throw new AppError(`Room ${room?.RoomNumber} is not available for selected dates`, 400, 'ROOM_NOT_AVAILABLE');
        }
      }

      // Create booking with transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create main booking
        const booking = await tx.booking.create({
          data: {
            UserID: userId,
            BookingDate: new Date(),
            CheckInDate: checkIn,
            CheckOutDate: checkOut,
            Status: 1, // Pending
            TotalAmount,
          },
        });

        // Create booking details for each room
        let totalSubTotal = 0;
        for (const roomItem of rooms) {
          const room = await tx.room.findUnique({
            where: { RoomID: roomItem.RoomID },
            include: { roomType: true },
          });

          if (!room) {
            throw new AppError(`Room ${roomItem.RoomID} not found`, 404, 'ROOM_NOT_FOUND');
          }

          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          const subTotal = room.Price * nights;

          await tx.bookingDetail.create({
            data: {
              BookingID: booking.BookingID,
              RoomID: roomItem.RoomID,
              CheckInDate: checkIn,
              CheckOutDate: checkOut,
              PricePerRoom: room.Price,
              SubTotal: subTotal,
            },
          });

          totalSubTotal += subTotal;
        }

        // Update total amount if needed
        if (totalSubTotal !== TotalAmount) {
          await tx.booking.update({
            where: { BookingID: booking.BookingID },
            data: { TotalAmount: totalSubTotal },
          });
        }

        // Create notification for user
        await tx.notification.create({
          data: {
            UserID: userId,
            BookingID: booking.BookingID,
            Title: 'New Booking Created',
            Message: `Your booking for ${rooms.length} room(s) from ${CheckInDate} to ${CheckOutDate} has been created. Please complete payment.`,
            Type: 'email',
            IsRead: false,
          },
        });

        return booking;
      });

      res.status(201).json(sendSuccess(result, 'Booking created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get all bookings (Admin/Staff)
  async getAllBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, userId, page = 1, limit = 10 } = req.query;

      const where: any = {};

      if (status) where.Status = Number(status);
      if (userId) where.UserID = Number(userId);

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          user: {
            select: { UserID: true, FullName: true, Email: true, Phone: true },
          },
          bookingDetails: {
            include: {
              room: {
                include: {
                  hotel: true,
                  roomType: true,
                },
              },
            },
          },
          payments: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' },
      });

      const total = await prisma.booking.count({ where });

      res.status(200).json(sendSuccess({
        bookings,
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

  // Get my bookings (Customer)
  async getMyBookings(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;
      const { status } = req.query;

      const where: any = { UserID: userId };
      if (status) where.Status = Number(status);

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          bookingDetails: {
            include: {
              room: {
                include: {
                  hotel: true,
                  roomType: true,
                },
              },
            },
          },
          payments: true,
        },
        orderBy: { CreatedAt: 'desc' },
      });

      res.status(200).json(sendSuccess(bookings));
    } catch (error) {
      next(error);
    }
  },

  // Get booking by ID
  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { BookingID: Number(id) },
        include: {
          user: {
            select: { UserID: true, FullName: true, Email: true, Phone: true, PassportOrId: true },
          },
          bookingDetails: {
            include: {
              room: {
                include: {
                  hotel: true,
                  roomType: true,
                },
              },
            },
          },
          payments: true,
          bookingServices: {
            include: { service: true },
          },
          notifications: true,
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      res.status(200).json(sendSuccess(booking));
    } catch (error) {
      next(error);
    }
  },

  // Update booking status
  async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { Status } = req.body;

      // Status: 1=Pending, 2=Confirmed, 3=Completed, 4=Cancelled

      const booking = await prisma.booking.findUnique({
        where: { BookingID: Number(id) },
        include: {
          bookingDetails: { include: { room: true } },
          user: true,
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      // If cancelling, free up rooms
      if (Status === 4 && booking.Status !== 4) {
        // Update room status back to available if they were occupied
        for (const detail of booking.bookingDetails) {
          await prisma.room.update({
            where: { RoomID: detail.RoomID },
            data: { Status: 1 }, // Available
          });
        }
      }

      // If confirming, update booking
      if (Status === 2) {
        // Check if payment completed
        const payments = await prisma.payment.findMany({
          where: { BookingID: booking.BookingID },
        });

        const totalPaid = payments.reduce((sum, p) => sum + p.Amount, 0);

        if (totalPaid < booking.TotalAmount) {
          throw new AppError('Cannot confirm booking: Full payment required', 400, 'PAYMENT_REQUIRED');
        }
      }

      const updated = await prisma.booking.update({
        where: { BookingID: Number(id) },
        data: { Status },
      });

      // Create notification
      let statusText = '';
      switch (Status) {
        case 2: statusText = 'Confirmed'; break;
        case 3: statusText = 'Completed'; break;
        case 4: statusText = 'Cancelled'; break;
        default: statusText = 'Updated';
      }

      await prisma.notification.create({
        data: {
          UserID: booking.user.UserID,
          BookingID: booking.BookingID,
          Title: `Booking ${statusText}`,
          Message: `Your booking #${booking.BookingID} has been ${statusText.toLowerCase()}.`,
          Type: 'email',
          IsRead: false,
        },
      });

      res.status(200).json(sendSuccess(updated, `Booking ${statusText} successfully`));
    } catch (error) {
      next(error);
    }
  },

  // Cancel booking (Customer)
  async cancelBooking(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.UserID;

      const booking = await prisma.booking.findFirst({
        where: {
          BookingID: Number(id),
          UserID: userId,
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      if (booking.Status === 3) {
        throw new AppError('Cannot cancel completed booking', 400, 'COMPLETED_BOOKING');
      }

      if (booking.Status === 4) {
        throw new AppError('Booking already cancelled', 400, 'ALREADY_CANCELLED');
      }

      const cancelled = await prisma.booking.update({
        where: { BookingID: Number(id) },
        data: { Status: 4 },
      });

      res.status(200).json(sendSuccess(cancelled, 'Booking cancelled successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Check-in
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { staffId } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { BookingID: Number(id) },
        include: {
          bookingDetails: { include: { room: true } },
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      if (booking.Status !== 2) {
        throw new AppError('Booking must be confirmed before check-in', 400, 'NOT_CONFIRMED');
      }

      // Update room status to Occupied
      for (const detail of booking.bookingDetails) {
        await prisma.room.update({
          where: { RoomID: detail.RoomID },
          data: { Status: 2 }, // Occupied
        });
      }

      res.status(200).json(sendSuccess(null, 'Check-in successful'));
    } catch (error) {
      next(error);
    }
  },

  // Check-out
  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { BookingID: Number(id) },
        include: {
          bookingDetails: { include: { room: true } },
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      // Update room status to Cleaning
      for (const detail of booking.bookingDetails) {
        await prisma.room.update({
          where: { RoomID: detail.RoomID },
          data: { Status: 3 }, // Cleaning
        });
      }

      // Update booking status to Completed
      await prisma.booking.update({
        where: { BookingID: Number(id) },
        data: { Status: 3 },
      });

      res.status(200).json(sendSuccess(null, 'Check-out successful'));
    } catch (error) {
      next(error);
    }
  },
};