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
      model: 'branches',
      key: 'branch_id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  contact_no: {
    type: DataTypes.STRING(20),
    allowNull: false
  }
}, {
  tableName: 'employee', // Fixed: Table name is singular in database
  timestamps: true
});

module.exports = Employee;
