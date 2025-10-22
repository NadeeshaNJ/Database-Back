const { Employee, Branch, User } = require('../models');
const { Op } = require('sequelize');

// Get all employees with optional filtering
exports.getAllEmployees = async (req, res) => {
  try {
    const { 
      branch_id, 
      role, 
      search, 
      limit = 100, 
      offset = 0 
    } = req.query;

    const whereClause = {};
    const userWhereClause = {};

    // Filter by branch
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    // Filter by role (role is stored in user_account table)
    if (role) {
      userWhereClause.role = role;
    }

    // Search by name or email
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['branch_id', 'branch_name', 'address', 'contact_no']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'role'],
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['employee_id', 'ASC']]
    });

    // Format the response
    const formattedEmployees = employees.map(emp => ({
      employee_id: emp.employee_id,
      user_id: emp.user_id,
      branch_id: emp.branch_id,
      name: emp.name,
      email: emp.email,
      contact_no: emp.contact_no,
      branch_name: emp.Branch?.branch_name,
      branch_address: emp.Branch?.address,
      role: emp.User?.role,
      username: emp.User?.username,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
    }));

    res.json({
      success: true,
      data: {
        employees: formattedEmployees,
        total: formattedEmployees.length
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};

// Get single employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['branch_id', 'branch_name', 'address', 'contact_no']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'role']
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: {
        employee: {
          employee_id: employee.employee_id,
          user_id: employee.user_id,
          branch_id: employee.branch_id,
          name: employee.name,
          email: employee.email,
          contact_no: employee.contact_no,
          branch_name: employee.Branch?.branch_name,
          role: employee.User?.role,
          username: employee.User?.username,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee',
      details: error.message
    });
  }
};

// Create new employee
exports.createEmployee = async (req, res) => {
  try {
    const { 
      user_id, 
      branch_id, 
      name, 
      email, 
      contact_no 
    } = req.body;

    // Validate required fields
    if (!user_id || !branch_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, branch_id, and name are required'
      });
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if branch exists
    const branch = await Branch.findByPk(branch_id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Check if email already exists
    if (email) {
      const existingEmployee = await Employee.findOne({ where: { email } });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Create employee
    const employee = await Employee.create({
      user_id,
      branch_id,
      name,
      email,
      contact_no
    });

    // Fetch the created employee with associations
    const createdEmployee = await Employee.findByPk(employee.employee_id, {
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['branch_id', 'branch_name']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee: createdEmployee
      }
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create employee',
      details: error.message
    });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      branch_id, 
      name, 
      email, 
      contact_no 
    } = req.body;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if branch exists if updating branch
    if (branch_id) {
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({ where: { email } });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Update employee
    await employee.update({
      branch_id: branch_id || employee.branch_id,
      name: name || employee.name,
      email: email !== undefined ? email : employee.email,
      contact_no: contact_no !== undefined ? contact_no : employee.contact_no
    });

    // Fetch updated employee with associations
    const updatedEmployee = await Employee.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['branch_id', 'branch_name']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'role']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        employee: updatedEmployee
      }
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee',
      details: error.message
    });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    await employee.destroy();

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee',
      details: error.message
    });
  }
};

// Get employee statistics
exports.getEmployeeStats = async (req, res) => {
  try {
    const { branch_id } = req.query;

    const whereClause = branch_id ? { branch_id } : {};

    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['role']
        }
      ]
    });

    const stats = {
      total: employees.length,
      byRole: {},
      byBranch: {}
    };

    employees.forEach(emp => {
      const role = emp.User?.role || 'Unknown';
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      stats.byBranch[emp.branch_id] = (stats.byBranch[emp.branch_id] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee statistics',
      details: error.message
    });
  }
};
