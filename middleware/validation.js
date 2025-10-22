const { body, param, query } = require('express-validator');

// Common validation rules
const commonValidations = {
  id: param('id').isInt({ min: 1 }).withMessage('Invalid ID format'),
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
};

// Auth validations
const authValidations = {
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  register: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('role')
      .isIn(['admin', 'receptionist', 'manager'])
      .withMessage('Invalid role')
  ]
};

// Room validations
const roomValidations = {
  create: [
    body('room_number')
      .trim()
      .notEmpty()
      .withMessage('Room number is required')
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Room number can only contain letters, numbers, and hyphens'),
    body('room_type')
      .isIn(['single', 'double', 'suite', 'deluxe', 'executive'])
      .withMessage('Invalid room type'),
    body('price_per_night')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('max_occupancy')
      .isInt({ min: 1 })
      .withMessage('Maximum occupancy must be at least 1'),
    body('floor')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Floor must be a positive number')
  ],
  update: [
    commonValidations.id,
    body('room_number')
      .optional()
      .trim()
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Room number can only contain letters, numbers, and hyphens'),
    body('room_type')
      .optional()
      .isIn(['single', 'double', 'suite', 'deluxe', 'executive'])
      .withMessage('Invalid room type'),
    body('price_per_night')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number')
  ]
};

// Booking validations
const bookingValidations = {
  create: [
    body('guest_id').isInt({ min: 1 }).withMessage('Valid guest ID is required'),
    body('room_id').isInt({ min: 1 }).withMessage('Valid room ID is required'),
    body('check_in')
      .isDate()
      .withMessage('Valid check-in date is required')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Check-in date must be in the future');
        }
        return true;
      }),
    body('check_out')
      .isDate()
      .withMessage('Valid check-out date is required')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.check_in)) {
          throw new Error('Check-out date must be after check-in date');
        }
        return true;
      }),
    body('adults')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Adults must be at least 1'),
    body('children')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Children cannot be negative')
  ],
  update: [
    commonValidations.id,
    body('check_in')
      .optional()
      .isDate()
      .withMessage('Valid check-in date is required'),
    body('check_out')
      .optional()
      .isDate()
      .withMessage('Valid check-out date is required')
  ]
};

// Guest validations
const guestValidations = {
  create: [
    body('first_name')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters'),
    body('last_name')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Valid phone number is required'),
    body('date_of_birth')
      .optional()
      .isDate()
      .withMessage('Valid date of birth is required')
  ]
};

// Payment validations
const paymentValidations = {
  create: [
    body('booking_id').isInt({ min: 1 }).withMessage('Valid booking ID is required'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('payment_method')
      .isIn(['credit_card', 'debit_card', 'cash', 'online', 'bank_transfer'])
      .withMessage('Invalid payment method')
  ]
};

// Employee validations
const employeeValidations = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Employee name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Employee name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .isLength({ max: 100 })
      .withMessage('Email must not exceed 100 characters'),
    body('contact_no')
      .trim()
      .notEmpty()
      .withMessage('Contact number is required')
      .isLength({ max: 20 })
      .withMessage('Contact number must not exceed 20 characters'),
    body('branch_id')
      .isInt({ min: 1 })
      .withMessage('Valid branch ID is required'),
    body('user_id')
      .isInt({ min: 1 })
      .withMessage('Valid user ID is required')
  ],
  update: [
    commonValidations.id,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Employee name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required')
      .isLength({ max: 100 })
      .withMessage('Email must not exceed 100 characters'),
    body('contact_no')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Contact number must not exceed 20 characters')
  ]
};

module.exports = {
  commonValidations,
  authValidations,
  roomValidations,
  bookingValidations,
  guestValidations,
  paymentValidations,
  employeeValidations
};