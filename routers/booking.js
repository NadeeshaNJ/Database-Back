const express = require('express');
const { query, body } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const bookingController = require('../controllers/bookingcontroller');
const { optionalAuth, authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all bookings - simple route for frontend
router.get('/', [
    query('status').optional().isIn(['Booked', 'Checked-In', 'Checked-Out', 'Cancelled']),
    query('check_in_start').optional().isDate(),
    query('check_in_end').optional().isDate(),
    query('guest_name').optional().trim(),
    query('room_number').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 })
], optionalAuth, asyncHandler(bookingController.getAllBookings));

// Create new booking - Everyone except Accountant
router.post('/', [
    body('guest_id').isInt({ min: 1 }).withMessage('Valid guest_id is required'),
    body('room_id').isInt({ min: 1 }).withMessage('Valid room_id is required'),
    body('check_in_date').isDate().withMessage('Valid check-in date is required'),
    body('check_out_date').isDate().withMessage('Valid check-out date is required'),
    body('num_adults').optional().isInt({ min: 1 }),
    body('num_children').optional().isInt({ min: 0 }),
    body('special_requests').optional().trim()
], authenticateToken, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Customer'), asyncHandler(async (req, res) => {
    const { pool } = require('../config/database');
    const { guest_id, room_id, check_in_date, check_out_date, num_adults, num_children, special_requests } = req.body;
    
    // Insert booking
    const result = await pool.query(
        `INSERT INTO public.booking (guest_id, room_id, check_in_date, check_out_date, num_adults, num_children, special_requests, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Confirmed', CURRENT_TIMESTAMP)
         RETURNING booking_id`,
        [guest_id, room_id, check_in_date, check_out_date, num_adults || 1, num_children || 0, special_requests]
    );
    
    res.json({
        success: true,
        message: 'Booking created successfully',
        data: { booking_id: result.rows[0].booking_id }
    });
}));

// Create pre-booking - Customer can request booking without room assignment
router.post('/pre-booking', [
    body('guest_id').isInt({ min: 1 }).withMessage('Valid guest_id is required'),
    body('branch_id').isInt({ min: 1 }).withMessage('Valid branch_id is required'),
    body('room_type_id').isInt({ min: 1 }).withMessage('Valid room_type_id is required'),
    body('check_in_date').isDate().withMessage('Valid check-in date is required'),
    body('check_out_date').isDate().withMessage('Valid check-out date is required'),
    body('num_adults').optional().isInt({ min: 1 }),
    body('num_children').optional().isInt({ min: 0 }),
    body('special_requests').optional().trim()
], authenticateToken, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Customer'), asyncHandler(async (req, res) => {
    const { pool } = require('../config/database');
    const { 
        guest_id, 
        branch_id, 
        room_type_id, 
        check_in_date, 
        check_out_date, 
        num_adults, 
        num_children, 
        special_requests 
    } = req.body;
    
    // Insert pre-booking
    const result = await pool.query(
        `INSERT INTO public.pre_booking (
            guest_id, branch_id, room_type_id, check_in_date, check_out_date, 
            num_adults, num_children, special_requests, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', CURRENT_TIMESTAMP)
        RETURNING pre_booking_id`,
        [
            guest_id, 
            branch_id, 
            room_type_id, 
            check_in_date, 
            check_out_date, 
            num_adults || 1, 
            num_children || 0, 
            special_requests
        ]
    );
    
    res.json({
        success: true,
        message: 'Pre-booking request submitted successfully. Our team will contact you shortly.',
        data: { pre_booking_id: result.rows[0].pre_booking_id }
    });
}));

module.exports = router;