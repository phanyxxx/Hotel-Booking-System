import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/response.util';

export const searchController = {
  // Search hotels with multiple criteria
  async searchHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        location,
        checkInDate,
        checkOutDate,
        guests,
        roomType,
        minPrice,
        maxPrice,
        sortBy,
        page = 1,
        limit = 10,
      } = req.query;

      // Base query for hotels
      const where: any = {};

      // Filter by location
      if (location) {
        where.OR = [
          { Location: { contains: location as string, mode: 'insensitive' } },
          { Address: { contains: location as string, mode: 'insensitive' } },
        ];
      }

      // Get hotels with their rooms
      let hotels = await prisma.hotel.findMany({
        where,
        include: {
          rooms: {
            where: { Status: 1 }, // Available rooms only
            include: { roomType: true },
          },
          reviews: true,
        },
      });

      // Filter by room type and price
      hotels = hotels.filter(hotel => {
        let availableRooms = hotel.rooms;

        // Filter by room type
        if (roomType) {
          availableRooms = availableRooms.filter(
            room => room.roomType.TypeName.toLowerCase() === (roomType as string).toLowerCase()
          );
        }

        // Filter by price
        if (minPrice || maxPrice) {
          availableRooms = availableRooms.filter(room => {
            let match = true;
            if (minPrice) match = match && room.Price >= Number(minPrice);
            if (maxPrice) match = match && room.Price <= Number(maxPrice);
            return match;
          });
        }

        // Check availability for dates
        if (checkInDate && checkOutDate) {
          const checkIn = new Date(checkInDate as string);
          const checkOut = new Date(checkOutDate as string);

          // Filter rooms that are not booked during this period
          availableRooms = availableRooms.filter(async (room) => {
            const conflictingBookings = await prisma.bookingDetail.findFirst({
              where: {
                RoomID: room.RoomID,
                AND: [
                  { CheckInDate: { lt: checkOut } },
                  { CheckOutDate: { gt: checkIn } },
                ],
              },
            });
            return !conflictingBookings;
          });
        }

        // Check guest capacity
        if (guests) {
          availableRooms = availableRooms.filter(
            room => Number(room.roomType.MaxOccupancy) >= Number(guests)
          );
        }

        // Store filtered rooms back
        (hotel as any).availableRooms = availableRooms;
        return availableRooms.length > 0;
      });

      // Calculate average rating and min price
      hotels = hotels.map(hotel => ({
        ...hotel,
        averageRating: hotel.reviews.length > 0
          ? hotel.reviews.reduce((sum, r) => sum + r.Rating, 0) / hotel.reviews.length
          : 0,
        minPrice: Math.min(...hotel.rooms.map(r => r.Price), 0),
        GalleryImages: hotel.GalleryImages ? JSON.parse(hotel.GalleryImages) : [],
      }));

      // Sort results
      if (sortBy) {
        switch (sortBy) {
          case 'price_asc':
            hotels.sort((a, b) => a.minPrice - b.minPrice);
            break;
          case 'price_desc':
            hotels.sort((a, b) => b.minPrice - a.minPrice);
            break;
          case 'rating_desc':
            hotels.sort((a, b) => b.averageRating - a.averageRating);
            break;
          default:
            break;
        }
      }

      // Pagination
      const start = (Number(page) - 1) * Number(limit);
      const paginatedHotels = hotels.slice(start, start + Number(limit));

      res.status(200).json(sendSuccess({
        hotels: paginatedHotels,
        total: hotels.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(hotels.length / Number(limit)),
      }));
    } catch (error) {
      next(error);
    }
  },

  // Compare hotels side by side
  async compareHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const { hotelIds } = req.query;

      if (!hotelIds) {
        throw new Error('Hotel IDs are required');
      }

      const ids = (hotelIds as string).split(',').map(id => Number(id));

      const hotels = await prisma.hotel.findMany({
        where: { HotelID: { in: ids } },
        include: {
          rooms: {
            include: { roomType: true },
          },
          reviews: true,
        },
      });

      const comparisonData = hotels.map(hotel => ({
        HotelID: hotel.HotelID,
        HotelName: hotel.HotelName,
        Location: hotel.Location,
        MainImage: hotel.MainImage,
        Description: hotel.Description,
        minPrice: Math.min(...hotel.rooms.map(r => r.Price), 0),
        averageRating: hotel.reviews.length > 0
          ? hotel.reviews.reduce((sum, r) => sum + r.Rating, 0) / hotel.reviews.length
          : 0,
        totalReviews: hotel.reviews.length,
        roomTypes: [...new Set(hotel.rooms.map(r => r.roomType.TypeName))],
      }));

      res.status(200).json(sendSuccess(comparisonData));
    } catch (error) {
      next(error);
    }
  },
};