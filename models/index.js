const { sequelize } = require('../config/database');
const User = require('./user');
const Room = require('./room');
const RoomType = require('./roomType');
const Guest = require('./guest');
const Booking = require('./booking');
const PreBooking = require('./preBooking');
const Payment = require('./payment');
const PaymentAdjustment = require('./paymentAdjustment');
const Service = require('./service');
const ServiceUsage = require('./serviceUsage');
const Branch = require('./branch');
const Employee = require('./employee');

// Room Type - Room Relationship
RoomType.hasMany(Room, { foreignKey: 'room_type_id' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id' });

// Guest - Booking Relationships
Guest.hasMany(Booking, { foreignKey: 'guest_id' });
Booking.belongsTo(Guest, { foreignKey: 'guest_id' });

// Guest - PreBooking Relationships
Guest.hasMany(PreBooking, { foreignKey: 'guest_id' });
PreBooking.belongsTo(Guest, { foreignKey: 'guest_id' });

// Room - Booking Relationships
Room.hasMany(Booking, { foreignKey: 'room_id' });
Booking.belongsTo(Room, { foreignKey: 'room_id' });

// Room - PreBooking Relationships
Room.hasMany(PreBooking, { foreignKey: 'room_id' });
PreBooking.belongsTo(Room, { foreignKey: 'room_id' });

// PreBooking - Booking Relationship
PreBooking.hasOne(Booking, { foreignKey: 'pre_booking_id' });
Booking.belongsTo(PreBooking, { foreignKey: 'pre_booking_id' });

// Booking - Payment Relationships
Booking.hasMany(Payment, { foreignKey: 'booking_id' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id' });

// Booking - PaymentAdjustment Relationships
Booking.hasMany(PaymentAdjustment, { foreignKey: 'booking_id' });
PaymentAdjustment.belongsTo(Booking, { foreignKey: 'booking_id' });

// Booking - ServiceUsage Relationships
Booking.hasMany(ServiceUsage, { foreignKey: 'booking_id' });
ServiceUsage.belongsTo(Booking, { foreignKey: 'booking_id' });

// Service - ServiceUsage Relationships
Service.hasMany(ServiceUsage, { foreignKey: 'service_id' });
ServiceUsage.belongsTo(Service, { foreignKey: 'service_id' });

// Branch - Employee Relationships
Branch.hasMany(Employee, { foreignKey: 'branch_id', as: 'Employees' });
Employee.belongsTo(Branch, { foreignKey: 'branch_id', as: 'Branch' });

// User - Employee Relationships
User.hasOne(Employee, { foreignKey: 'user_id', as: 'Employee' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'User', targetKey: 'user_id' });

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL database:', error);
    throw error;
  }
};

// Sync all models with database
const syncDatabase = async (force = false) => {
  try {
    // With an existing database, we don't need to sync/create tables
    await sequelize.authenticate();
    console.log(`
🎉 Connected to existing database successfully!
   Database tables will be used as-is without modification.`);
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Room,
  RoomType,
  Guest,
  Booking,
  PreBooking,
  Payment,
  PaymentAdjustment,
  Service,
  ServiceUsage,
  Branch,
  Employee,
  testConnection,
  syncDatabase
};