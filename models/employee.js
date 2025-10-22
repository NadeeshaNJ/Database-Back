const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Employee = sequelize.define('Employee', {
  employee_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branch', // Fixed table name
      key: 'branch_id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user_account', // Fixed table name
      key: 'user_id' // Fixed key name
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true, // Made nullable to match database
    unique: true,
    validate: {
      isEmail: true
    }
  },
  contact_no: {
    type: DataTypes.STRING(20),
    allowNull: true // Made nullable to match database
  }
}, {
  tableName: 'employee', // Fixed: Table name is singular in database
  timestamps: false // Disable timestamps since the table doesn't have createdAt/updatedAt
});

module.exports = Employee;
