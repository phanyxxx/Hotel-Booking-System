import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const reviewController = {
  // Create review
  async createReview(req: any, res: Response, next: NextFunction) {
    try {
      const { HotelID, Rating, Comment } = req.body;
      const userId = req.user.UserID;

      // Check if user has completed booking at this hotel
      const hasCompletedBooking = await prisma.booking.findFirst({
        where: {
          UserID: userId,
          Status: 3, // Completed
          bookingDetails: {
            some: {
              room: {
                HotelID,
              },
            },
          },
        },
      });

      if (!hasCompletedBooking) {
        throw new AppError('You can only review hotels you have stayed at', 403, 'NO_STAY_HISTORY');
      }

      // Check if already reviewed
      const existingReview = await prisma.review.findFirst({
        where: {
          UserID: userId,
          HotelID,
        },
      });

      if (existingReview) {
        throw new AppError('You have already reviewed this hotel', 400, 'ALREADY_REVIEWED');
      }

      const review = await prisma.review.create({
        data: {
          UserID: userId,
          HotelID,
          Rating,
          Comment,
        },
        include: {
          user: {
            select: { FullName: true, Email: true },
          },
        },
      });

      res.status(201).json(sendSuccess(review, 'Review submitted successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get reviews for a hotel
  async getHotelReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { hotelId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const reviews = await prisma.review.findMany({
        where: { HotelID: Number(hotelId) },
        include: {
          user: {
            select: { FullName: true, Email: true },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' },
      });

      const total = await prisma.review.count({
        where: { HotelID: Number(hotelId) },
      });

      // Calculate rating distribution
      const ratingDistribution = await prisma.review.groupBy({
        by: ['Rating'],
        where: { HotelID: Number(hotelId) },
        _count: { Rating: true },
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length
        : 0;

      res.status(200).json(sendSuccess({
        reviews,
        averageRating,
        totalReviews: total,
        ratingDistribution,
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

  // Update review (only owner)
  async updateReview(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { Rating, Comment } = req.body;
      const userId = req.user.UserID;

      const review = await prisma.review.findUnique({
        where: { ReviewID: Number(id) },
      });

      if (!review) {
        throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
      }

      if (review.UserID !== userId && req.user.RoleName !== 'Admin') {
        throw new AppError('You can only update your own reviews', 403, 'FORBIDDEN');
      }

      const updated = await prisma.review.update({
        where: { ReviewID: Number(id) },
        data: { Rating, Comment },
      });

      res.status(200).json(sendSuccess(updated, 'Review updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Delete review (owner or admin)
  async deleteReview(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.UserID;

      const review = await prisma.review.findUnique({
        where: { ReviewID: Number(id) },
      });

      if (!review) {
        throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
      }

      if (review.UserID !== userId && req.user.RoleName !== 'Admin') {
        throw new AppError('You can only delete your own reviews', 403, 'FORBIDDEN');
      }

      await prisma.review.delete({
        where: { ReviewID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Review deleted successfully'));
    } catch (error) {
      next(error);
    }
  },
};