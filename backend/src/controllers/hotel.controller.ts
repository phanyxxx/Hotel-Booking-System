import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinary.util';

export const hotelController = {
  // Create Hotel with images
  async createHotel(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as any;
      const {
        HotelName,
        Address,
        Location,
        Phone,
        Email,
        Description,
      } = req.body;

      // Upload images
      let mainImageUrl = null;
      let logoImageUrl = null;
      let galleryUrls: string[] = [];

      if (files?.mainImage) {
        mainImageUrl = await uploadToCloudinary(files.mainImage[0].path);
      }

      if (files?.logoImage) {
        logoImageUrl = await uploadToCloudinary(files.logoImage[0].path);
      }

      if (files?.galleryImages) {
        galleryUrls = await uploadMultipleToCloudinary(files.galleryImages);
      }

      const hotel = await prisma.hotel.create({
        data: {
          HotelName,
          Address,
          Location,
          Phone,
          Email,
          Description,
          MainImage: mainImageUrl,
          LogoImage: logoImageUrl,
          GalleryImages: JSON.stringify(galleryUrls),
        },
      });

      res.status(201).json(sendSuccess(hotel, 'Hotel created successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get all hotels
  async getAllHotels(req: Request, res: Response, next: NextFunction) {
    try {
      const { location, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

      const where: any = {};

      if (location) {
        where.Location = { contains: location as string, mode: 'insensitive' };
      }

      const hotels = await prisma.hotel.findMany({
        where,
        include: {
          rooms: {
            where: { Status: 1 }, // Available rooms
            include: { roomType: true },
          },
          reviews: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      // Parse gallery images for each hotel
      const hotelsWithParsedImages = hotels.map((hotel) => ({
        ...hotel,
        GalleryImages: hotel.GalleryImages ? JSON.parse(hotel.GalleryImages) : [],
        averageRating: hotel.reviews.length > 0
          ? hotel.reviews.reduce((sum, r) => sum + r.Rating, 0) / hotel.reviews.length
          : 0,
      }));

      const total = await prisma.hotel.count({ where });

      res.status(200).json(sendSuccess({
        hotels: hotelsWithParsedImages,
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

  // Get hotel by ID
  async getHotelById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const hotel = await prisma.hotel.findUnique({
        where: { HotelID: Number(id) },
        include: {
          rooms: {
            include: { roomType: true },
          },
          reviews: {
            include: { user: true },
          },
        },
      });

      if (!hotel) {
        throw new AppError('Hotel not found', 404, 'HOTEL_NOT_FOUND');
      }

      const hotelWithParsedImages = {
        ...hotel,
        GalleryImages: hotel.GalleryImages ? JSON.parse(hotel.GalleryImages) : [],
        averageRating: hotel.reviews.length > 0
          ? hotel.reviews.reduce((sum, r) => sum + r.Rating, 0) / hotel.reviews.length
          : 0,
      };

      res.status(200).json(sendSuccess(hotelWithParsedImages));
    } catch (error) {
      next(error);
    }
  },

  // Update hotel
  async updateHotel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const files = req.files as any;
      const {
        HotelName,
        Address,
        Location,
        Phone,
        Email,
        Description,
      } = req.body;

      const existingHotel = await prisma.hotel.findUnique({
        where: { HotelID: Number(id) },
      });

      if (!existingHotel) {
        throw new AppError('Hotel not found', 404, 'HOTEL_NOT_FOUND');
      }

      let mainImageUrl = existingHotel.MainImage;
      let logoImageUrl = existingHotel.LogoImage;
      let galleryUrls = existingHotel.GalleryImages ? JSON.parse(existingHotel.GalleryImages) : [];

      if (files?.mainImage) {
        mainImageUrl = await uploadToCloudinary(files.mainImage[0].path);
      }

      if (files?.logoImage) {
        logoImageUrl = await uploadToCloudinary(files.logoImage[0].path);
      }

      if (files?.galleryImages) {
        const newGalleryUrls = await uploadMultipleToCloudinary(files.galleryImages);
        galleryUrls = [...galleryUrls, ...newGalleryUrls];
      }

      const hotel = await prisma.hotel.update({
        where: { HotelID: Number(id) },
        data: {
          HotelName,
          Address,
          Location,
          Phone,
          Email,
          Description,
          MainImage: mainImageUrl,
          LogoImage: logoImageUrl,
          GalleryImages: JSON.stringify(galleryUrls),
        },
      });

      res.status(200).json(sendSuccess(hotel, 'Hotel updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete hotel
  async deleteHotel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const hotel = await prisma.hotel.findUnique({
        where: { HotelID: Number(id) },
        include: { rooms: true, bookings: true },
      });

      if (!hotel) {
        throw new AppError('Hotel not found', 404, 'HOTEL_NOT_FOUND');
      }

      // Check if hotel has bookings
      if (hotel.bookings && hotel.bookings.length > 0) {
        throw new AppError('Cannot delete hotel with existing bookings', 400, 'HAS_BOOKINGS');
      }

      await prisma.hotel.delete({
        where: { HotelID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Hotel deleted successfully'));
    } catch (error) {
      next(error);
    }
  },
};