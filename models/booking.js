const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;
const { BOOKING_STATUS } = require('../utils/enums');

const Booking = sequelize.define('Booking', {
  booking_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  pre_booking_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'pre_bookings',
      key: 'pre_booking_id'
    }
  },
  guest_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'guests',
      key: 'guest_id'
    }
  },
  room_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'room_id'
    }
  },
  check_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  check_out_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isAfterCheckIn(value) {
        if (value <= this.check_in_date) {
          throw new Error('Check-out date must be after check-in date');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM(...Object.values(BOOKING_STATUS)),
    allowNull: false,
    defaultValue: BOOKING_STATUS.BOOKED
  },
  booked_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax_rate_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  late_fee_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  preferred_payment_method: {
    type: DataTypes.ENUM('Cash', 'Card', 'Online', 'BankTransfer'),
    allowNull: true
  },
  advance_payment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'booking',
  schema: 'public',
  timestamps: false,
  underscored: true,
  freezeTableName: true
});

module.exports = Booking;