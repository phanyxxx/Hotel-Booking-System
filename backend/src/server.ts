import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import roleRoutes from './routes/role.routes';

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
      hotels: 'GET /api/hotels',
      rooms: 'GET /api/rooms'
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
app.use('/api/roles', roleRoutes);
app.get('/api/hotels', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Hotels endpoint - Coming soon',
    hotels: [
      { id: 1, name: 'Sample Hotel 1', location: 'Phnom Penh' },
      { id: 2, name: 'Sample Hotel 2', location: 'Siem Reap' }
    ]
  });
});

app.get('/api/rooms', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Rooms endpoint - Coming soon',
    rooms: [
      { id: 1, roomNumber: '101', type: 'Standard', price: 50 },
      { id: 2, roomNumber: '102', type: 'Deluxe', price: 80 }
    ]
  });
});

// ==================== 404 HANDLER (FIXED) ====================
// ប្រើ app.use ជំនួស app.all ដើម្បីជៀសវាងបញ្ហា path-to-regexp
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'GET /api/hotels',
      'GET /api/rooms'
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
  console.log(`🏨 Hotels: http://localhost:${PORT}/api/hotels`);
  console.log('='.repeat(50));
});