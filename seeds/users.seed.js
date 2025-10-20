const { User } = require('../models');
const { hashPassword } = require('../utils/helper'); // Fixed: helper.js not helpers.js

const seedUsers = async () => {
  try {
    console.log('👥 Seeding users...');
    
    const users = [
      {
        username: 'admin',
        password: await hashPassword('admin123'),
        role: 'Admin' // Capitalized to match database schema
      },
      {
        username: 'manager',
        password: await hashPassword('manager123'),
        role: 'Manager' // Capitalized to match database schema
      },
      {
        username: 'reception',
        password: await hashPassword('reception123'),
        role: 'Receptionist' // Capitalized to match database schema
      },
      {
        username: 'accountant',
        password: await hashPassword('accountant123'),
        role: 'Accountant' // New accountant user
      },
      {
        username: 'staff1',
        password: await hashPassword('staff123'),
        role: 'Receptionist' // Capitalized to match database schema
      }
    ];

    for (const userData of users) {
      await User.findOrCreate({
        where: { username: userData.username },
        defaults: userData
      });
    }

    console.log(`✅ ${users.length} users seeded`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

module.exports = seedUsers;