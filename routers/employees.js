const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Note: Ensure the roles used here ('Admin', 'Manager') match the exact case 
// stored in your database's user_account.role column.

// Get all employees (with optional filters)
router.get('/', 
  authenticateToken,
  // Required roles for viewing all employee data
  authorizeRoles('Admin', 'Manager'), 
  employeeController.getAllEmployees
);

// Get employee statistics
router.get('/stats', 
  authenticateToken, 
  authorizeRoles('Admin', 'Manager'), 
  employeeController.getEmployeeStats
);

// Get single employee by ID
router.get('/:id', 
  authenticateToken, 
  // Often, any employee or the employee themselves should be able to view their own profile.
  // Assuming general authenticated access is sufficient here, but Manager/Admin might be better.
  employeeController.getEmployeeById
);

// Create new employee
router.post('/', 
  authenticateToken, 
  authorizeRoles('Admin', 'Manager'), 
  employeeController.createEmployee
);

// Update employee
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('Admin', 'Manager'), 
  employeeController.updateEmployee
);

// Delete employee
router.delete('/:id', 
  authenticateToken, 
  // Deleting employees should typically be restricted to the highest level.
  authorizeRoles('Admin'), 
  employeeController.deleteEmployee
);

module.exports = router;
