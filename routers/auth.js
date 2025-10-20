const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { Op } = require('sequelize');
const { registerStaffController,registerCustomerController } = require('../controllers/authcontroller'); 
const { updateStaffProfileController, updateCustomerProfileController } = require('../controllers/authcontroller'); 

const router = express.Router();

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// Login route
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user with employee information (includes branch_id)
    const user = await User.findOne({ 
      where: { 
        username: username.toLowerCase()
      },
      include: [{
        association: 'Employee',
        required: false,
        attributes: ['employee_id', 'branch_id', 'name', 'email']
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Extract employee data if exists
    const employee = user.Employee;
    const branch_id = employee?.branch_id || null;
    const employee_id = employee?.employee_id || null;

    const token = generateToken(user.user_id, user.role);

    res.json({
      success: true,
      data: {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          branch_id: branch_id,  // ← NOW INCLUDED!
          employee_id: employee_id
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register route 
// router.post('/register', [
//   body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   body('role').isIn(['admin', 'receptionist', 'manager']).withMessage('Invalid role')
// ]/*, authenticateToken, authorizeRoles('admin')*/,
// router.post('/register', [
//   // Validation checks for all required fields in the JSON payload
//   body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   // Must include the 'customer' role from your schema
//   body('role').isIn(['admin', 'receptionist', 'manager', 'customer']).withMessage('Invalid role'),
//   // Add required employee validation for staff roles (assuming all staff must have these)
//   body('full_name').optional().notEmpty().withMessage('Full name is required for staff roles'),
//   body('branch_id').optional().isInt({ gt: 0 }).withMessage('Valid branch ID is required for staff roles'),
//   body('guest_ID').optional().isInt({ gt: 0 }).withMessage('Valid guest ID is required for staff roles')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array()
//       });
//     }

//     const { username,email, password, role,guest_id } = req.body;

//     const existingUser = await User.findOne({
//       where: {
//         [Op.or]: [
//           { username: username.toLowerCase() },
//           // { email: email.toLowerCase() }
//         ]
//       }
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         error: 'Username or email already exists'
//       });
//     }

//     const user = await User.create({ 
//       username: username.toLowerCase(),
//       password, 
//       role,
//       guest_id
//     });

//     res.status(201).json({
//       success: true,
//       message: 'User created successfully',
//       user: {
//         user_id: user.user_id,
//         username: user.username,
//         password: user.password_hash,
//         role: user.role,
//         guest_id:user.guest_id
//       }
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({
//       success: false,
//       error: `Internal server error ${error.message}`
//     });
//   }
// });

//Get current user profile

// Register route 
router.post('/register/staff', [
  // Validation checks for all required fields in the JSON payload
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters').toLowerCase(),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Admin', 'Receptionist', 'Manager', 'Customer']).withMessage('Invalid role'),
  body('full_name').optional().notEmpty().withMessage('Full name is required for staff roles'),
  body('branch_id').optional().isInt({ gt: 0 }).withMessage('Valid branch ID is required for staff roles'),
  body('guest_id').optional().isInt({ gt: 0 }).withMessage('Valid guest ID must be an integer') // ✅ Corrected casing
], async (req, res, next) => { // Must include 'next' for error passing
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username } = req.body;

    // 1. Uniqueness Check (Local and Fast)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username.toLowerCase() },
          // Note: Email check removed since it's not on user_account table
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists' // ✅ FIX: Cannot check email here
      });
    }

    // 2. Delegation to Transaction Handler
    // If user is unique, call the controller function to handle the complex INSERT transaction and response.
    // The controller function (registerController) will execute the logic and send the final response.
    return registerStaffController(req, res, next);

  } catch (error) {
    console.error('Registration error (Router):', error);
    res.status(500).json({
      success: false,
      error: `Internal server error ${error.message}`
    });
  }
});

// New Customer Registration Route
router.post('/register/customer', [
  // 1. User Account Validation
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters').toLowerCase(),
  body('email').isEmail().withMessage('Valid email is required'), // Used for uniqueness check and linking
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').equals('Customer').withMessage('Role must be Customer for this endpoint.'),
  
  // 2. Guest Profile Validation (Aligns with full guest table schema)
  body('full_name').notEmpty().withMessage('Full name is required.'), // NOT NULL in schema
  body('contact_no').optional().isString().withMessage('Contact number is optional but must be a string.'), // Maps to phone
  body('nic').optional().isString().withMessage('NIC must be a string.'),
  body('gender').optional().isString().withMessage('Gender must be a valid ENUM value.'),
  body('date_of_birth').optional().isDate().withMessage('Date of birth must be a valid date (YYYY-MM-DD).'),
  body('address').optional().isString().withMessage('Address must be a string.'),
  body('nationality').optional().isString().withMessage('Nationality must be a string.')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username } = req.body;

    // 1. Uniqueness Check (Quick lookup before starting transaction)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username.toLowerCase() },
          // Note: Email uniqueness is checked by the DB transaction on guest.email
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // 2. Delegation to Transaction Handler
    // We delegate to the controller, which must handle the 'Customer' logic.
    return registerCustomerController(req, res, next);

  } catch (error) {
    console.error('Registration error (Router):', error);
    res.status(500).json({
      success: false,
      error: `Internal server error ${error.message}`
    });
  }
});


router.get('/profile', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});


// router.put('/updateprofile/staff', [
//   // 1️⃣ Username validation (optional)
//   body('username')
//     .optional()
//     .isLength({ min: 3 })
//     .withMessage('Username must be at least 3 characters'),

//   // 2️⃣ Email validation
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Valid email is required'),

//   // 3️⃣ Password validation (new + current)
//   body('new_password')
//     .optional()
//     .isLength({ min: 6 })
//     .withMessage('New password must be at least 6 characters'),

//   body('current_password').custom((value, { req }) => {
//     if (req.body.new_password && !value) {
//       throw new Error('Current password is required when setting a new password');
//     }
//     return true;
//   }),

//   // 4️⃣ Role validation — allowed staff roles only
//   body('role')
//     .optional()
//     .isIn(['Admin', 'Manager', 'Receptionist', 'Accountant'])
//     .withMessage('Invalid role'),

//   // 5️⃣ Employee table optional fields (COALESCE-friendly)
//   body('first_name').optional().isString().withMessage('First name must be a string.'),
//   body('last_name').optional().isString().withMessage('Last name must be a string.'),
//   body('contact_no').optional().isString().withMessage('Contact number must be a string.'),
//   body('nic').optional().isString().withMessage('NIC must be a string.'),
//   body('address').optional().isString().withMessage('Address must be a string.'),
//   body('branch_id').optional().isInt().withMessage('Branch ID must be an integer.')
// ],
// authenticateToken,
// authorizeRoles(['Admin', 'Manager', 'Receptionist', 'Accountant']),
// async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array()
//       });
//     }

//     const { username } = req.body;
//     const currentUserId = req.user.userId; // ✅ consistent with JWT payload naming

//     // ✅ Check if new username is unique
//     if (username) {
//       const existingUser = await User.findOne({
//         where: {
//           username: username.toLowerCase(),
//           user_id: { [Op.ne]: currentUserId }
//         }
//       });

//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           error: 'Username is already taken by another user'
//         });
//       }
//     }

//     // ✅ Delegate to staff update controller (user_account + employee)
//     return updateStaffProfileController(req, res, next);

//   } catch (error) {
//     console.error('Staff Profile update error (Router):', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Internal server error'
//     });
//   }
// });


// Customer Profile Update Route

// In routers/auth.js

// In routers/auth.js

router.put('/updateprofile/staff', [
  // 1. Validation checks for staff updates
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('new_password').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty.'),
  body('contact_no').optional().isString().withMessage('Contact number must be a string.'),
  // Note: 'role' validation is intentionally removed from body validation as it should not be updated by the user
  // 'current_password' validation is now handled by the custom function (if new_password is provided)
  body('current_password').optional().custom((value, { req }) => {
      if (req.body.new_password && !value) {
          throw new Error('Current password is required to change password.');
      }
      return true;
  }).withMessage('Current password is required to change password.'),
  
  // 2. Authorization Middleware
], authenticateToken, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Accountant'),
async (req, res, next) => { 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username } = req.body;
    const currentUserId = req.user.userId; // Correctly retrieving userId from JWT

    // 3. Uniqueness Check (Pre-Delegation)
    if (username) {
      const existingUser = await User.findOne({
        where: {
          username: username.toLowerCase(),
          user_id: { [Op.ne]: currentUserId } 
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken by another user'
        });
      }
    }

    // 4. Delegation to Staff Controller
    // The transaction logic is handled here, using the corrected logic from the controller.
    return updateStaffProfileController(req, res, next);

  } catch (error) {
    console.error('Staff Profile update error (Router):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


router.put('/updateprofile/customer', [
  // 1. Username (Optional update)
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  
  // 2. Email Validation
  body('email').optional().isEmail().withMessage('Valid email is required'),
  
  // 3. Password Check (Conditional requirement check)
  body('new_password').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('current_password').custom((value, { req }) => {
      // Logic: Only require current_password if new_password is being provided.
      if (req.body.new_password && !value) {
          throw new Error('Current password is required when setting a new password');
      }
      return true;
  }).withMessage('Current password is required to change password'),
  
  // 4. Guest Table Fields (Optional for update, provided to satisfy COALESCE)
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty.'), 
  body('nic').optional().isString().withMessage('NIC must be a string.'),
  body('contact_no').optional().isString().withMessage('Contact number must be a string.'),
  body('date_of_birth').optional().isDate().withMessage('Date of birth must be a valid date.'),
  body('address').optional().isString().withMessage('Address must be a string.'),
  body('nationality').optional().isString().withMessage('Nationality must be a string.')
  
  // 🛑 Removed body('guest_id') validation entirely as it should not be sent by the client.
], authenticateToken, authorizeRoles(['Customer']), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username } = req.body;
    
    // ✅ CRITICAL FIX: Use the correct camelCase property name from the JWT payload
    const currentUserId = req.user.userId;

    // Check for unique username only if a new username is provided
    if (username) {
      const existingUser = await User.findOne({
        where: {
          username: username.toLowerCase(),
          // Ensure we exclude the current user's correctly retrieved ID
          user_id: { [Op.ne]: currentUserId } 
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken by another user'
        });
      }
    }

    // Delegation to Controller
    // The controller function will handle the multi-table update (user_account + guest)
    return updateCustomerProfileController(req, res, next);

  } catch (error) {
    console.error('Customer Profile update error (Router):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;