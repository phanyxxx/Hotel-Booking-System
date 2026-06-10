import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response.util';

export const notificationController = {
  // Get all notifications for current user
  async getMyNotifications(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;
      const { isRead, page = 1, limit = 20 } = req.query;

      const where: any = { UserID: userId };
      
      if (isRead !== undefined) {
        where.IsRead = isRead === 'true';
      }

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          booking: {
            select: {
              BookingID: true,
              Status: true,
              TotalAmount: true,
              CheckInDate: true,
              CheckOutDate: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' },
      });

      const total = await prisma.notification.count({ where });
      const unreadCount = await prisma.notification.count({
        where: { UserID: userId, IsRead: false },
      });

      res.status(200).json(sendSuccess({
        notifications,
        unreadCount,
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

  // Mark notification as read
  async markAsRead(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.UserID;

      const notification = await prisma.notification.findFirst({
        where: {
          NotificationID: Number(id),
          UserID: userId,
        },
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      const updated = await prisma.notification.update({
        where: { NotificationID: Number(id) },
        data: { IsRead: true },
      });

      res.status(200).json(sendSuccess(updated, 'Marked as read'));
    } catch (error) {
      next(error);
    }
  },

  // Mark all notifications as read
  async markAllAsRead(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;

      await prisma.notification.updateMany({
        where: {
          UserID: userId,
          IsRead: false,
        },
        data: { IsRead: true },
      });

      res.status(200).json(sendSuccess(null, 'All notifications marked as read'));
    } catch (error) {
      next(error);
    }
  },

  // Delete notification
  async deleteNotification(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.UserID;

      const notification = await prisma.notification.findFirst({
        where: {
          NotificationID: Number(id),
          UserID: userId,
        },
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      await prisma.notification.delete({
        where: { NotificationID: Number(id) },
      });

      res.status(200).json(sendSuccess(null, 'Notification deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Get all notifications (Admin only)
  async getAllNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, type, isRead, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (userId) where.UserID = Number(userId);
      if (type) where.Type = type;
      if (isRead !== undefined) where.IsRead = isRead === 'true';

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              UserID: true,
              FullName: true,
              Email: true,
            },
          },
          booking: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { CreatedAt: 'desc' },
      });

      const total = await prisma.notification.count({ where });

      res.status(200).json(sendSuccess({
        notifications,
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

  // Create notification (Admin/System)
  async createNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { UserID, BookingID, Title, Message, Type } = req.body;

      const notification = await prisma.notification.create({
        data: {
          UserID,
          BookingID,
          Title,
          Message,
          Type,
          IsRead: false,
        },
        include: {
          user: {
            select: { FullName: true, Email: true },
          },
        },
      });

      res.status(201).json(sendSuccess(notification, 'Notification sent successfully'));
    } catch (error) {
      next(error);
    }
  },

  // Send bulk notifications
  async sendBulkNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { userIds, Title, Message, Type } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs are required', 400, 'USER_IDS_REQUIRED');
      }

      const notifications = await prisma.notification.createMany({
        data: userIds.map((userId: number) => ({
          UserID: userId,
          Title,
          Message,
          Type: Type || 'app',
          IsRead: false,
        })),
      });

      res.status(201).json(sendSuccess({
        sentCount: notifications.count,
      }, `Sent to ${notifications.count} users`));
    } catch (error) {
      next(error);
    }
  },

  // Get notification settings for user
  async getNotificationSettings(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;

      // You can store settings in a separate table or return defaults
      const settings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        bookingConfirmations: true,
        paymentReceipts: true,
        promotions: false,
        reminders: true,
      };

      res.status(200).json(sendSuccess(settings));
    } catch (error) {
      next(error);
    }
  },

  // Update notification settings
  async updateNotificationSettings(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.UserID;
      const settings = req.body;

      // Here you would save to a UserSettings table
      // For now, just return success
      res.status(200).json(sendSuccess(settings, 'Settings updated successfully'));
    } catch (error) {
      next(error);
    }
  },
};