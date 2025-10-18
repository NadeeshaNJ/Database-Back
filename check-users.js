require('dotenv').config();
const { User } = require('./models');

(async () => {
  try {
    const users = await User.findAll({ 
      attributes: ['user_id', 'username', 'role'],
      limit: 5
    });
    
    console.log('Total users found:', users.length);
    
    if (users.length === 0) {
      console.log('⚠️  No users in database! You need to run seeds.');
      console.log('Run: npm run db:seed');
    } else {
      console.log('\nUsers in database:');
      users.forEach(user => {
        console.log(`- ${user.username} (${user.role})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
