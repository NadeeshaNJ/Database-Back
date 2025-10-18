const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const roomController = require('../controllers/roomcontroller');

const router = express.Router();

// Get all rooms with availability check
router.get('/', optionalAuth, [
  query('check_in').optional().isDate().withMessage('Invalid check-in date'),
  query('check_out').optional().isDate().withMessage('Invalid check-out date'),
  query('room_type').optional().isIn(['single', 'double', 'suite', 'deluxe', 'executive']),
  query('min_price').optional().isFloat({ min: 0 }),
  query('max_price').optional().isFloat({ min: 0 }),
  query('guests').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['available', 'occupied', 'maintenance', 'cleaning']),
  query('floor').optional().isInt({ min: 1 }),
  query('has_balcony').optional().isBoolean(),
  query('has_sea_view').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(roomController.getAllRooms));

// Get room types summary - MUST be before /:id route
router.get('/types/summary', optionalAuth, asyncHandler(roomController.getRoomTypesSummary));

// Get room availability for date range - MUST be before /:id route
router.get('/availability/check', optionalAuth, [
  query('start_date').optional().isDate(),
  query('end_date').optional().isDate()
], asyncHandler(roomController.getRoomAvailability));

// Get room by ID - MUST be after specific routes to avoid catching them
router.get('/:id', optionalAuth, asyncHandler(roomController.getRoomById));

// Create new room (admin/manager only)
router.post('/', [
  body('room_number').notEmpty().withMessage('Room number is required'),
  body('room_type').isIn(['single', 'double', 'suite', 'deluxe', 'executive']).withMessage('Invalid room type'),
  body('price_per_night').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('max_occupancy').isInt({ min: 1 }).withMessage('Valid occupancy is required')
], authenticateToken, authorizeRoles('admin', 'manager'), asyncHandler(roomController.createRoom));

// Update room (admin/manager only)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), asyncHandler(roomController.updateRoom));

// Delete room (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(roomController.deleteRoom));

// Update room status (admin/manager only)
router.patch('/:id/status', [
  body('status').isIn(['available', 'occupied', 'maintenance', 'cleaning']).withMessage('Invalid room status')
], authenticateToken, authorizeRoles('admin', 'manager'), asyncHandler(roomController.updateRoomStatus));

module.exports = router;