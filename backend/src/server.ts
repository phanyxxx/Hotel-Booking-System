import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import roleRoutes from './routes/role.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import hotelRoutes from './routes/hotel.routes';
import reviewRoutes from './routes/review.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';
import roomRoutes from './routes/room.routes';
import serviceRoutes from './routes/service.routes';
import paymentRoutes from './routes/payment.routes';
import bookingRoutes from './routes/booking.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== HEALTH CHECK ====================
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Hotel Management API is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== ROOT ENDPOINT ====================
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    name: 'Hotel Management System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      test: 'GET /api/test',
      auth: 'POST /api/auth/register, POST /api/auth/login',
      hotels: 'GET /api/hotels',
      rooms: 'GET /api/rooms',
      bookings: 'GET /api/bookings',
      services: 'GET /api/services'
    }
  });
});

// ==================== TEST ROUTES ====================
app.get('/api/test', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ==================== API ROUTES ====================
// Order matters! Specific routes first, then dynamic routes
app.use('/api/roles', roleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ==================== 404 HANDLER ====================
// ត្រូវតែនៅចុងបំផុត ក្រោយ routes ទាំងអស់
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/hotels',
      'GET /api/rooms',
      'GET /api/bookings',
      'GET /api/services'
    ]
  });
});

// ==================== ERROR HANDLER ====================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🏨 HOTEL MANAGEMENT SYSTEM API');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Register: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🏨 Hotels: http://localhost:${PORT}/api/hotels`);
  console.log('='.repeat(50));
});