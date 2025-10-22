const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all employees (with optional filters)
router.get('/', 
  authenticateToken, 
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
  authorizeRoles('Admin'), 
  employeeController.deleteEmployee
);

module.exports = router;
