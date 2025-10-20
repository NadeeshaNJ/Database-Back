const userSeed = require('./users.seed');
const employeeSeed = require('./employees.seed');
const roomSeed = require('./rooms.seed');
const guestSeed = require('./guests.seed');
const bookingSeed = require('./bookings.seed');
const { sequelize } = require('../models');

const seedAll = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('✅ Database synced');
    
    // Run seeds in order
    await userSeed();
    await employeeSeed(); // Must run after userSeed
    await roomSeed();
    await guestSeed();
    await bookingSeed();
    
    console.log('🎉 All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedAll();
}

module.exports = seedAll;