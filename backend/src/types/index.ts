// ==================== Type Exports ====================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserPayload {
  UserID: number;
  Email: string;
  RoleID: number;
  RoleName?: string;
}

export interface HotelInput {
  HotelName: string;
  Address: string;
  Location: string;
  Phone: string;
  Email?: string;
  Description?: string;
  MainImage?: string;
  GalleryImages?: string[];
  LogoImage?: string;
}

export interface RoomInput {
  HotelID: number;
  RoomTypeID: number;
  RoomNumber: string;
  Price: number;
  Status?: number;
  FloorNumber?: number;
}

export interface BookingInput {
  CheckInDate: Date;
  CheckOutDate: Date;
  rooms: { RoomID: number }[];
  TotalAmount: number;
}

export interface PaymentInput {
  BookingID: number;
  Amount: number;
  PaymentMethod: string;
  TransactionReference?: string;
}

export interface ReviewInput {
  HotelID: number;
  Rating: number;
  Comment?: string;
}

export interface SearchFilters {
  location?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  guests?: number;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc';
  page?: number;
  limit?: number;
}

// ==================== Enum Exports ====================
export enum RoomStatus {
  AVAILABLE = 1,
  OCCUPIED = 2,
  CLEANING = 3,
  MAINTENANCE = 4,
}

export enum BookingStatus {
  PENDING = 1,
  CONFIRMED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
}

export enum PaymentStatus {
  PENDING = 1,
  PAID = 2,
  FAILED = 3,
}

export enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 0,
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  APP = 'app',
}

// ==================== Role Constants ====================
export const ROLES = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  GUEST: 'Guest',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ==================== Helper Functions ====================
export const getBookingStatusText = (status: number): string => {
  switch (status) {
    case 1: return 'Pending';
    case 2: return 'Confirmed';
    case 3: return 'Completed';
    case 4: return 'Cancelled';
    default: return 'Unknown';
  }
};

export const getRoomStatusText = (status: number): string => {
  switch (status) {
    case 1: return 'Available';
    case 2: return 'Occupied';
    case 3: return 'Cleaning';
    case 4: return 'Maintenance';
    default: return 'Unknown';
  }
};

export const getPaymentStatusText = (status: number): string => {
  switch (status) {
    case 1: return 'Pending';
    case 2: return 'Paid';
    case 3: return 'Failed';
    default: return 'Unknown';
  }
};

export const calculateNights = (checkIn: Date, checkOut: Date): number => {
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};