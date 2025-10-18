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

// Create pre-booking - Customer selects room type, system auto-assigns room
router.post('/pre-booking', [
    body('guest_id').isInt({ min: 1 }).withMessage('Valid guest_id is required'),
    body('room_type_id').isInt({ min: 1 }).withMessage('Valid room_type_id is required'),
    body('branch_id').isInt({ min: 1 }).withMessage('Valid branch_id is required'),
    body('capacity').isInt({ min: 1, max: 10 }).withMessage('Valid capacity (1-10) is required'),
    body('prebooking_method').isIn(['Online', 'Phone', 'Walk_in']).withMessage('Valid prebooking method is required'),
    body('expected_check_in').isDate().withMessage('Valid check-in date is required'),
    body('expected_check_out').isDate().withMessage('Valid check-out date is required')
], authenticateToken, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Customer'), asyncHandler(async (req, res) => {
    const { pool } = require('../config/database');
    const { 
        guest_id, 
        room_type_id,
        branch_id,
        capacity, 
        prebooking_method, 
        expected_check_in, 
        expected_check_out
    } = req.body;
    
    // Validate dates
    if (new Date(expected_check_out) <= new Date(expected_check_in)) {
        return res.status(400).json({
            success: false,
            error: 'Check-out date must be after check-in date'
        });
    }
    
    // Start transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Find an available room of the requested type in the selected branch
        // Room is available if:
        // 1. Current status is 'Available'
        // 2. No future_status conflict OR future dates don't overlap with requested dates
        const availableRoomQuery = `
            SELECT r.room_id, r.room_number, rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.room_type_id
            WHERE r.room_type_id = $1
            AND r.branch_id = $2
            AND r.status = 'Available'
            AND (
                r.future_status IS NULL 
                OR r.unavailable_from IS NULL 
                OR r.unavailable_to IS NULL
                OR NOT (
                    (r.unavailable_from <= $4 AND r.unavailable_to >= $3)
                    OR (r.unavailable_from <= $3 AND r.unavailable_to >= $4)
                    OR (r.unavailable_from >= $3 AND r.unavailable_to <= $4)
                )
            )
            AND r.room_id NOT IN (
                SELECT room_id 
                FROM booking
                WHERE status NOT IN ('Cancelled', 'Checked-Out')
                AND (
                    (check_in_date <= $4 AND check_out_date >= $3)
                    OR (check_in_date <= $3 AND check_out_date >= $4)
                    OR (check_in_date >= $3 AND check_out_date <= $4)
                )
            )
            ORDER BY r.room_number
            LIMIT 1
        `;
        
        const roomResult = await client.query(availableRoomQuery, [
            room_type_id,
            branch_id,
            expected_check_in,
            expected_check_out
        ]);
        
        if (roomResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'No available rooms of the selected type for the requested dates. Please try different dates or room type.'
            });
        }
        
        const assignedRoom = roomResult.rows[0];
        
        // Update room to mark it as unavailable for the requested dates
        await client.query(
            `UPDATE room 
             SET future_status = 'Unavailable',
                 unavailable_from = $1,
                 unavailable_to = $2
             WHERE room_id = $3`,
            [expected_check_in, expected_check_out, assignedRoom.room_id]
        );
        
        // Insert pre-booking with assigned room
        const preBookingResult = await client.query(
            `INSERT INTO public.pre_booking (
                guest_id, 
                capacity, 
                prebooking_method, 
                expected_check_in, 
                expected_check_out, 
                room_id,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING pre_booking_id`,
            [
                guest_id, 
                capacity, 
                prebooking_method, 
                expected_check_in, 
                expected_check_out, 
                assignedRoom.room_id
            ]
        );
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Pre-booking confirmed! Room ${assignedRoom.room_number} (${assignedRoom.room_type_name}) has been reserved for you.`,
            data: { 
                pre_booking_id: preBookingResult.rows[0].pre_booking_id,
                room_id: assignedRoom.room_id,
                room_number: assignedRoom.room_number,
                room_type: assignedRoom.room_type_name
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;