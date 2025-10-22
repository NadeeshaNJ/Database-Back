// const express = require('express');

// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const authRoutes = require('./routers/auth');
// const roomRoutes = require('./routers/rooms');
// const bookingRoutes = require('./routers/booking');
// const guestRoutes = require('./routers/guests');
// const paymentRoutes = require('./routers/payments');

// const app = express();

// // Security middleware
// app.use(helmet());

// // CORS configuration
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));

// // Logging
// app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // ✅ HEALTH CHECK ROUTE - MOVED TO TOP
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     success: true, 
//     message: 'Hotel Management API is running',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV
//   });
// });

// // Routes - AFTER health check
// app.use('/api/auth', authRoutes);
// app.use('/api/rooms', roomRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/guests', guestRoutes);
// app.use('/api/payments', paymentRoutes);

// // Error handling middleware
// app.use((error, req, res, next) => {
//   console.error('Error stack:', error.stack);
  
//   if (error.name === 'SequelizeValidationError') {
//     return res.status(400).json({
//       success: false,
//       error: 'Validation error',
//       details: error.errors.map(err => err.message)
//     });
//   }

//   if (error.name === 'SequelizeUniqueConstraintError') {
//     return res.status(400).json({
//       success: false,
//       error: 'Duplicate entry',
//       details: error.errors.map(err => err.message)
//     });
//   }

//   res.status(500).json({ 
//     success: false,
//     error: `Internal server error ${error.message}` 
//   });
// });

// // 404 handler - KEEP AT BOTTOM
// app.use('*', (req, res) => {
//   res.status(404).json({ 
//     success: false,
//     error: 'Route not found' 
//   });
// });

// module.exports = app;


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routers/auth');
const roomRoutes = require('./routers/rooms');
const bookingRoutes = require('./routers/booking');
const guestRoutes = require('./routers/guests');
const paymentRoutes = require('./routers/payments');
const serviceUsageRoutes = require('./routers/serviceUsage');
const servicesRoutes = require('./routers/services');
const branchRoutes = require('./routers/branches');
const billingRoutes = require('./routers/billing');
const reportsRoutes = require('./routers/reports');
const employeeRoutes = require('./routers/employees');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Support both local development and production
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://nadeeshanj.github.io'  // GitHub Pages production
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true 
}));

app.use(express.json());
// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 🛑 FIX: GLOBAL Body parsing middleware is REMOVED from here to prevent GET crashes.
// It is applied locally to the routers below.

// ✅ ROOT ROUTE - Welcome message
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'SkyNest Hotel Management API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      branches: '/api/branches',
      rooms: '/api/rooms',
      guests: '/api/guests',
      bookings: '/api/bookings',
      payments: '/api/payments',
      services: '/api/services',
      serviceUsage: '/api/service-usage',
      billing: '/api/billing',
      reports: '/api/reports',
      employees: '/api/employees'
    },
    documentation: 'https://github.com/NadeeshaNJ/Database-Back'
  });
});

// ✅ HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Hotel Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Routes - AFTER health check
// ✅ FIX: Apply express.json() and express.urlencoded() locally to routes that require a body.

const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true });

// Apply body parsers to routers that use POST/PUT/PATCH
app.use('/api/auth', jsonParser, urlencodedParser, authRoutes);
app.use('/api/rooms', jsonParser, urlencodedParser, roomRoutes);
app.use('/api/bookings', jsonParser, urlencodedParser, bookingRoutes);
app.use('/api/guests', jsonParser, urlencodedParser, guestRoutes);
app.use('/api/payments', jsonParser, urlencodedParser, paymentRoutes);
app.use('/api/service-usage', jsonParser, urlencodedParser, serviceUsageRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/employees', jsonParser, urlencodedParser, employeeRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error stack:', error.stack);
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors.map(err => err.message)
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      details: error.errors.map(err => err.message)
    });
  }

  res.status(500).json({ 
    success: false,
    // Ensure the message is safe to display (if error is non-standard)
    error: `Internal server error ${error.message}` 
  });
});

// 404 handler - KEEP AT BOTTOM
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

module.exports = app;