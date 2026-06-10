import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const paymentController = {
  // Create payment for booking
  async createPayment(req: any, res: Response, next: NextFunction) {
    try {
      const { BookingID, Amount, PaymentMethod, TransactionReference } = req.body;
      const userId = req.user.UserID;

      const booking = await prisma.booking.findUnique({
        where: { BookingID },
        include: { payments: true, user: true },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      // Check if user owns this booking
      if (req.user.RoleName !== 'Admin' && booking.UserID !== userId) {
        throw new AppError('You can only pay for your own bookings', 403, 'FORBIDDEN');
      }

      const totalPaid = booking.payments.reduce((sum, p) => sum + p.Amount, 0);
      const newTotalPaid = totalPaid + Amount;

      let paymentStatus = 1; // Pending
      if (newTotalPaid >= booking.TotalAmount) {
        paymentStatus = 2; // Paid
      }

      const payment = await prisma.payment.create({
        data: {
          BookingID,
          Amount,
          PaymentMethod,
          PaymentStatus: paymentStatus,
          TransactionReference,
        },
      });

      // If full payment, update booking status to Confirmed
      if (paymentStatus === 2 && booking.Status === 1) {
        await prisma.booking.update({
          where: { BookingID },
          data: { Status: 2 }, // Confirmed
        });

        // Create notification
        await prisma.notification.create({
          data: {
            UserID: booking.user.UserID,
            BookingID: booking.BookingID,
            Title: 'Payment Completed',
            Message: `Your payment of $${Amount} for booking #${booking.BookingID} has been received. Your booking is now confirmed.`,
            Type: 'email',
            IsRead: false,
          },
        });
      }

      res.status(201).json(sendSuccess(payment, 'Payment processed successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get payments for a booking
  async getPaymentsByBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;

      const payments = await prisma.payment.findMany({
        where: { BookingID: Number(bookingId) },
        orderBy: { PaymentDate: 'desc' },
      });

      const booking = await prisma.booking.findUnique({
        where: { BookingID: Number(bookingId) },
        select: { TotalAmount: true },
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.Amount, 0);

      res.status(200).json(sendSuccess({
        payments,
        totalAmount: booking?.TotalAmount || 0,
        totalPaid,
        remainingBalance: (booking?.TotalAmount || 0) - totalPaid,
      }));
    } catch (error) {
      next(error);
    }
  },

  // Get my payment history
  async getMyPaymentHistory(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;

      const payments = await prisma.payment.findMany({
        where: {
          booking: {
            UserID: userId,
          },
        },
        include: {
          booking: {
            include: {
              bookingDetails: {
                include: {
                  room: { include: { hotel: true } },
                },
              },
            },
          },
        },
        orderBy: { PaymentDate: 'desc' },
      });

      res.status(200).json(sendSuccess(payments));
    } catch (error) {
      next(error);
    }
  },

  // Get all payments (Admin)
  async getAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const where: any = {};
      if (status) where.PaymentStatus = Number(status);

      const payments = await prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              user: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { PaymentDate: 'desc' },
      });

      const total = await prisma.payment.count({ where });

      res.status(200).json(sendSuccess({
        payments,
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
};