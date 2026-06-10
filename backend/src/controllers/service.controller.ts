import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const serviceController = {
  // Get all services
  async getAllServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const where: any = {};
      if (status !== undefined) where.Status = Number(status);

      const services = await prisma.service.findMany({
        where,
        include: {
          bookingServices: {
            select: {
              BookingServiceID: true,
              Quantity: true,
              SubTotal: true,
              booking: {
                select: {
                  BookingID: true,
                  bookingDetails: {
                    include: {
                      room: {
                        include: { hotel: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { ServiceID: 'asc' },
      });

      // Add usage count to each service
      const servicesWithStats = services.map(service => ({
        ...service,
        totalUsed: service.bookingServices.length,
        totalRevenue: service.bookingServices.reduce((sum, bs) => sum + bs.SubTotal, 0),
      }));

      const total = await prisma.service.count({ where });

      res.status(200).json(sendSuccess({
        services: servicesWithStats,
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

  // Get service by ID
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { ServiceID: Number(id) },
        include: {
          bookingServices: {
            include: {
              booking: {
                include: {
                  user: {
                    select: { FullName: true, Email: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      res.status(200).json(sendSuccess(service));
    } catch (error) {
      next(error);
    }
  },

  // Create service (Admin only)
  async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const { ServiceName, Price, Description, Status } = req.body;

      if (!ServiceName || !Price) {
        throw new AppError('Service name and price are required', 400, 'MISSING_FIELDS');
      }

      const service = await prisma.service.create({
        data: {
          ServiceName,
          Price,
          Description,
          Status: Status || 1,
        },
      });

      res.status(201).json(sendSuccess(service, 'Service created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Update service
  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { ServiceName, Price, Description, Status } = req.body;

      const service = await prisma.service.findUnique({
        where: { ServiceID: Number(id) },
      });

      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      const updated = await prisma.service.update({
        where: { ServiceID: Number(id) },
        data: {
          ServiceName,
          Price,
          Description,
          Status,
        },
      });

      res.status(200).json(sendSuccess(updated, 'Service updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete service
  async deleteService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { ServiceID: Number(id) },
        include: { bookingServices: true },
      });

      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      if (service.bookingServices.length > 0) {
        throw new AppError('Cannot delete service that has been used in bookings', 400, 'SERVICE_IN_USE');
      }

      await prisma.service.delete({
        where: { ServiceID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Service deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Add service to booking
  async addServiceToBooking(req: any, res: Response, next: NextFunction) {
    try {
      const { BookingID, ServiceID, Quantity } = req.body;
      const userId = req.user.UserID;

      // Check if booking exists and belongs to user
      const booking = await prisma.booking.findFirst({
        where: {
          BookingID,
          UserID: userId,
        },
      });

      if (!booking && req.user.RoleName !== 'Admin') {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      // Get service details
      const service = await prisma.service.findUnique({
        where: { ServiceID },
      });

      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      if (service.Status !== 1) {
        throw new AppError('Service is currently unavailable', 400, 'SERVICE_UNAVAILABLE');
      }

      const subTotal = service.Price * Quantity;

      // Check if service already added
      const existing = await prisma.bookingService.findFirst({
        where: {
          BookingID,
          ServiceID,
        },
      });

      let bookingService;
      if (existing) {
        // Update quantity
        bookingService = await prisma.bookingService.update({
          where: { BookingServiceID: existing.BookingServiceID },
          data: {
            Quantity: existing.Quantity + Quantity,
            SubTotal: (existing.Quantity + Quantity) * service.Price,
          },
          include: { service: true },
        });
      } else {
        // Create new
        bookingService = await prisma.bookingService.create({
          data: {
            BookingID,
            ServiceID,
            Quantity,
            Price: service.Price,
            SubTotal: subTotal,
          },
          include: { service: true },
        });
      }

      // Update booking total amount
      const allServices = await prisma.bookingService.findMany({
        where: { BookingID },
      });
      const servicesTotal = allServices.reduce((sum, bs) => sum + bs.SubTotal, 0);
      
      // Get room total from booking details
      const bookingDetails = await prisma.bookingDetail.findMany({
        where: { BookingID },
      });
      const roomsTotal = bookingDetails.reduce((sum, bd) => sum + bd.SubTotal, 0);
      
      const newTotalAmount = roomsTotal + servicesTotal;

      await prisma.booking.update({
        where: { BookingID },
        data: { TotalAmount: newTotalAmount },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          UserID: booking.UserID,
          BookingID,
          Title: 'Service Added',
          Message: `${service.ServiceName} x${Quantity} has been added to your booking. Total updated to $${newTotalAmount}.`,
          Type: 'email',
          IsRead: false,
        },
      });

      res.status(200).json(sendSuccess(bookingService, 'Service added to booking'));
    } catch (error) {
      next(error);
    }
  },

  // Get services for a booking
  async getBookingServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;

      const bookingServices = await prisma.bookingService.findMany({
        where: { BookingID: Number(bookingId) },
        include: {
          service: true,
        },
      });

      const total = bookingServices.reduce((sum, bs) => sum + bs.SubTotal, 0);

      res.status(200).json(sendSuccess({
        services: bookingServices,
        totalServiceAmount: total,
      }));
    } catch (error) {
      next(error);
    }
  },

  // Remove service from booking
  async removeServiceFromBooking(req: any, res: Response, next: NextFunction) {
    try {
      const { bookingServiceId } = req.params;

      const bookingService = await prisma.bookingService.findUnique({
        where: { BookingServiceID: Number(bookingServiceId) },
        include: { booking: true, service: true },
      });

      if (!bookingService) {
        throw new AppError('Booking service not found', 404, 'NOT_FOUND');
      }

      // Check permission
      if (bookingService.booking.UserID !== req.user.UserID && req.user.RoleName !== 'Admin') {
        throw new AppError('Permission denied', 403, 'FORBIDDEN');
      }

      await prisma.bookingService.delete({
        where: { BookingServiceID: Number(bookingServiceId) },
      });

      // Update booking total
      const remainingServices = await prisma.bookingService.findMany({
        where: { BookingID: bookingService.BookingID },
      });
      const servicesTotal = remainingServices.reduce((sum, bs) => sum + bs.SubTotal, 0);
      
      const bookingDetails = await prisma.bookingDetail.findMany({
        where: { BookingID: bookingService.BookingID },
      });
      const roomsTotal = bookingDetails.reduce((sum, bd) => sum + bd.SubTotal, 0);
      
      const newTotalAmount = roomsTotal + servicesTotal;

      await prisma.booking.update({
        where: { BookingID: bookingService.BookingID },
        data: { TotalAmount: newTotalAmount },
      });

      res.status(200).json(sendSuccess(null, 'Service removed from booking'));
    } catch (error) {
      next(error);
    }
  },

  // Get popular services (for dashboard)
  async getPopularServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 10 } = req.query;

      const services = await prisma.service.findMany({
        include: {
          bookingServices: true,
        },
      });

      const popular = services
        .map(service => ({
          ServiceID: service.ServiceID,
          ServiceName: service.ServiceName,
          Price: service.Price,
          totalUsed: service.bookingServices.length,
          totalQuantity: service.bookingServices.reduce((sum, bs) => sum + bs.Quantity, 0),
          totalRevenue: service.bookingServices.reduce((sum, bs) => sum + bs.SubTotal, 0),
        }))
        .sort((a, b) => b.totalUsed - a.totalUsed)
        .slice(0, Number(limit));

      res.status(200).json(sendSuccess(popular));
    } catch (error) {
      next(error);
    }
  },
};