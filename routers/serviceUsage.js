const express = require('express');
const { query, body } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const serviceUsageController = require('../controllers/serviceUsageControllerNew');
const { optionalAuth, authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all service usages with filters
router.get('/', [
    query('booking_id').optional().isInt({ min: 1 }),
    query('service_id').optional().isInt({ min: 1 }),
    query('guest_name').optional().trim(),
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 })
], optionalAuth, asyncHandler(serviceUsageController.getAllServiceUsages));

// Get service usages by booking IDs
router.get('/booking/:bookingId ', optionalAuth, asyncHandler(serviceUsageController.getServiceUsagesByBooking));

// Create new service usage - Only Admin, Manager, Receptionist
router.post('/', [
    body('booking_id').isInt({ min: 1 }).withMessage('Valid booking_id is required'),
    body('service_id').isInt({ min: 1 }).withMessage('Valid service_id is required'),
    body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('used_on').isDate().withMessage('Valid service date is required')
], authenticateToken, authorizeRoles('Admin', 'Manager', 'Receptionist'), asyncHandler(async (req, res) => {
    const { pool } = require('../config/database');
    const { booking_id, service_id, qty, used_on } = req.body;
    
    // Get service details for price calculation
    const serviceResult = await pool.query(
        'SELECT unit_price FROM public.service_catalog WHERE service_id = $1',
        [service_id]
    );
    
    if (serviceResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Service not found' });
    }
    
    const { unit_price } = serviceResult.rows[0];
    
    // Insert service usage (storing the unit price at the time of use)
    const result = await pool.query(
        `INSERT INTO public.service_usage (booking_id, service_id, qty, used_on, unit_price_at_use)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING service_usage_id`,
        [booking_id, service_id, qty, used_on, unit_price]
    );
    
    res.json({
        success: true,
        message: 'Service usage created successfully',
        data: { 
            service_usage_id: result.rows[0].service_usage_id,
            unit_price_at_use: unit_price,
            qty: qty,
            total: parseFloat(unit_price) * qty
        }
    });
}));

module.exports = router;