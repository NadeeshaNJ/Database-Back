require('dotenv').config();
const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

(async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Updating user passwords...\n');
    
    // Default password for all users
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    // Update all users with the new hashed password
    const result = await client.query(
      `UPDATE public.user_account 
       SET password_hash = $1 
       RETURNING user_id, username, role`,
      [hashedPassword]
    );
    
    console.log(`✅ Updated ${result.rowCount} user passwords\n`);
    console.log('Updated users:');
    result.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });
    
    console.log(`\n🔑 Default password for all users: ${defaultPassword}`);
    console.log('\nYou can now login with:');
    console.log('  Username: manager_kandy');
    console.log('  Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
