const { Employee, Branch, User, sequelize } = require('../models');
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

    // Build WHERE conditions
    let whereConditions = [];
    let params = {};
    
    if (branch_id) {
      whereConditions.push('e.branch_id = :branch_id');
      params.branch_id = branch_id;
    }
    
    if (role) {
      whereConditions.push('u.role = :role');
      params.role = role;
    }
    
    if (search) {
      whereConditions.push('(e.name ILIKE :search OR e.email ILIKE :search)');
      params.search = `%${search}%`;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Execute raw SQL query
    const [employees] = await sequelize.query(`
      SELECT 
        e.employee_id,
        e.user_id,
        e.branch_id,
        e.name,
        e.email,
        e.contact_no,
        b.branch_name,
        b.address as branch_address,
        u.username,
        u.role
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN user_account u ON e.user_id = u.user_id
      ${whereClause}
      ORDER BY e.employee_id ASC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        ...params,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

    // Format the response
    const formattedEmployees = employees.map(emp => ({
      employee_id: emp.employee_id,
      user_id: emp.user_id,
      branch_id: emp.branch_id,
      name: emp.name,
      email: emp.email,
      contact_no: emp.contact_no,
      branch_name: emp.branch_name,
      branch_address: emp.branch_address,
      role: emp.role,
      username: emp.username
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

    const [employees] = await sequelize.query(`
      SELECT 
        e.employee_id,
        e.user_id,
        e.branch_id,
        e.name,
        e.email,
        e.contact_no,
        b.branch_name,
        b.address as branch_address,
        u.username,
        u.role
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN user_account u ON e.user_id = u.user_id
      WHERE e.employee_id = :id
    `, {
      replacements: { id }
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const employee = employees[0];

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
          branch_name: employee.branch_name,
          role: employee.role,
          username: employee.username
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
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      username,
      password,
      role,
      branch_id, 
      name, 
      email, 
      contact_no 
    } = req.body;

    // Log received data for debugging
    console.log('Received employee creation data:', {
      username,
      hasPassword: !!password,
      passwordLength: password?.length,
      role,
      branch_id,
      name,
      email,
      contact_no
    });

    // Validate required fields
    if (!username || !password || !role || !branch_id || !name) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, password, role, branch_id, and name are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Validate role is a staff role
    const validRoles = ['Admin', 'Manager', 'Receptionist', 'Accountant'];
    if (!validRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be Admin, Manager, Receptionist, or Accountant'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ 
      where: { username: username.toLowerCase() },
      transaction 
    });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Check if branch exists
    const branch = await Branch.findByPk(branch_id, { transaction });
    if (!branch) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Check if email already exists
    if (email) {
      const existingEmployee = await Employee.findOne({ 
        where: { email },
        transaction 
      });
      if (existingEmployee) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Create user account first
    const user = await User.create({
      username: username.toLowerCase(),
      password_hash: password, // Will be hashed by the model hook
      role
    }, { transaction });

    // Create employee record
    const employee = await Employee.create({
      user_id: user.user_id,
      branch_id,
      name,
      email,
      contact_no
    }, { transaction });

    // Commit transaction
    await transaction.commit();

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
          attributes: ['user_id', 'username', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Employee and user account created successfully',
      data: {
        employee: createdEmployee,
        credentials: {
          username: username.toLowerCase(),
          note: 'Please save the password securely'
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
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

    const whereClause = branch_id ? 'WHERE e.branch_id = :branch_id' : '';

    const [roleStats] = await sequelize.query(`
      SELECT 
        u.role,
        COUNT(*) as count
      FROM employee e
      LEFT JOIN user_account u ON e.user_id = u.user_id
      ${whereClause}
      GROUP BY u.role
    `, {
      replacements: branch_id ? { branch_id } : {}
    });

    const [branchStats] = await sequelize.query(`
      SELECT 
        e.branch_id,
        b.branch_name,
        COUNT(*) as count
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      ${whereClause}
      GROUP BY e.branch_id, b.branch_name
    `, {
      replacements: branch_id ? { branch_id } : {}
    });

    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM employee e
      ${whereClause}
    `, {
      replacements: branch_id ? { branch_id } : {}
    });

    const stats = {
      total: parseInt(totalCount[0]?.total || 0),
      byRole: {},
      byBranch: {}
    };

    roleStats.forEach(stat => {
      stats.byRole[stat.role] = parseInt(stat.count);
    });

    branchStats.forEach(stat => {
      stats.byBranch[stat.branch_id] = {
        name: stat.branch_name,
        count: parseInt(stat.count)
      };
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