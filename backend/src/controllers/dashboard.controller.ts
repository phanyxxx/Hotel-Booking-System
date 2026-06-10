import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/response.util';

export const dashboardController = {
  // Get overview statistics
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      // Parallel queries for efficiency
      const [
        totalHotels,
        totalRooms,
        availableRooms,
        totalUsers,
        todayBookings,
        monthBookings,
        totalRevenue,
        monthRevenue,
        pendingBookings,
        todayCheckIns,
      ] = await Promise.all([
        prisma.hotel.count(),
        prisma.room.count(),
        prisma.room.count({ where: { Status: 1 } }),
        prisma.user.count(),
        prisma.booking.count({ where: { BookingDate: { gte: today } } }),
        prisma.booking.count({ where: { CreatedAt: { gte: startOfMonth } } }),
        prisma.payment.aggregate({
          where: { PaymentStatus: 2 },
          _sum: { Amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            PaymentStatus: 2,
            PaymentDate: { gte: startOfMonth },
          },
          _sum: { Amount: true },
        }),
        prisma.booking.count({ where: { Status: 1 } }),
        prisma.booking.count({
          where: {
            Status: 2,
            CheckInDate: { gte: today, lt: new Date(today.getTime() + 86400000) },
          },
        }),
      ]);

      res.status(200).json(sendSuccess({
        hotels: {
          total: totalHotels,
        },
        rooms: {
          total: totalRooms,
          available: availableRooms,
          occupied: totalRooms - availableRooms,
          occupancyRate: totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms * 100).toFixed(2) : 0,
        },
        users: {
          total: totalUsers,
        },
        bookings: {
          today: todayBookings,
          thisMonth: monthBookings,
          pending: pendingBookings,
        },
        revenue: {
          total: totalRevenue._sum.Amount || 0,
          thisMonth: monthRevenue._sum.Amount || 0,
        },
        operations: {
          todayCheckIns,
        },
      }));
    } catch (error) {
      next(error);
    }
  },

  // Revenue report
  async getRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const payments = await prisma.payment.findMany({
        where: {
          PaymentStatus: 2,
          PaymentDate: {
            gte: start,
            lte: end,
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
        orderBy: { PaymentDate: 'asc' },
      });

      // Group by day/week/month
      const groupedData: any = {};

      payments.forEach(payment => {
        let key = '';
        const date = new Date(payment.PaymentDate!);

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekNumber = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
          key = `${date.getFullYear()}-W${weekNumber}`;
        } else {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            period: key,
            amount: 0,
            count: 0,
            hotels: new Set(),
          };
        }

        groupedData[key].amount += payment.Amount;
        groupedData[key].count += 1;
        if (payment.booking?.bookingDetails[0]?.room?.hotel?.HotelName) {
          groupedData[key].hotels.add(payment.booking.bookingDetails[0].room.hotel.HotelName);
        }
      });

      const result = Object.values(groupedData).map((item: any) => ({
        period: item.period,
        amount: item.amount,
        count: item.count,
        hotelsCount: item.hotels.size,
      }));

      res.status(200).json(sendSuccess({
        summary: {
          totalRevenue: payments.reduce((sum, p) => sum + p.Amount, 0),
          totalTransactions: payments.length,
          averageTransaction: payments.length > 0
            ? payments.reduce((sum, p) => sum + p.Amount, 0) / payments.length
            : 0,
        },
        details: result,
      }));
    } catch (error) {
      next(error);
    }
  },

  // Booking statistics
  async getBookingStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year), 11, 31);

      const bookingsByMonth = await prisma.$queryRaw`
        SELECT 
          EXTRACT(MONTH FROM "CheckInDate") as month,
          COUNT(*) as total_bookings,
          SUM("TotalAmount") as revenue
        FROM "tblBookings"
        WHERE "CheckInDate" >= ${startDate} AND "CheckInDate" <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM "CheckInDate")
        ORDER BY month ASC
      `;

      const bookingsByStatus = await prisma.booking.groupBy({
        by: ['Status'],
        _count: { Status: true },
      });

      const statusMap: any = {
        1: 'Pending',
        2: 'Confirmed',
        3: 'Completed',
        4: 'Cancelled',
      };

      const statusData = bookingsByStatus.map(item => ({
        status: statusMap[item.Status] || 'Unknown',
        count: item._count.Status,
      }));

      res.status(200).json(sendSuccess({
        byMonth: bookingsByMonth,
        byStatus: statusData,
      }));
    } catch (error) {
      next(error);
    }
  },

  // Top hotels report
  async getTopHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 10, sortBy = 'revenue' } = req.query;

      let orderBy: any = {};

      if (sortBy === 'revenue') {
        orderBy = { bookings: { _count: 'desc' } };
      } else if (sortBy === 'rating') {
        orderBy = { reviews: { _avg: { Rating: 'desc' } } };
      } else if (sortBy === 'bookings') {
        orderBy = { bookings: { _count: 'desc' } };
      }

      const hotels = await prisma.hotel.findMany({
        take: Number(limit),
        include: {
          rooms: true,
          reviews: true,
          bookings: {
            include: { payments: true },
          },
        },
      });

      const processedHotels = hotels.map(hotel => ({
        HotelID: hotel.HotelID,
        HotelName: hotel.HotelName,
        Location: hotel.Location,
        MainImage: hotel.MainImage,
        totalRooms: hotel.rooms.length,
        totalBookings: hotel.bookings.length,
        totalRevenue: hotel.bookings.reduce(
          (sum, booking) => sum + (booking.payments[0]?.Amount || 0),
          0
        ),
        averageRating: hotel.reviews.length > 0
          ? hotel.reviews.reduce((sum, r) => sum + r.Rating, 0) / hotel.reviews.length
          : 0,
        totalReviews: hotel.reviews.length,
      }));

      // Sort
      if (sortBy === 'revenue') {
        processedHotels.sort((a, b) => b.totalRevenue - a.totalRevenue);
      } else if (sortBy === 'rating') {
        processedHotels.sort((a, b) => b.averageRating - a.averageRating);
      } else if (sortBy === 'bookings') {
        processedHotels.sort((a, b) => b.totalBookings - a.totalBookings);
      }

      res.status(200).json(sendSuccess(processedHotels));
    } catch (error) {
      next(error);
    }
  },
};