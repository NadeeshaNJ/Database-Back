const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Branch = sequelize.define('Branch', {
  branch_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branch_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  contact_number: {
    type: DataTypes.STRING(30), // Updated to match schema
    allowNull: true // Made nullable to match database
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true // Made nullable to match database
  },
  manager_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  branch_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  }
}, {
  tableName: 'branch', // Fixed: Table name is singular in database
  timestamps: false // Disable timestamps
});

module.exports = Branch;
