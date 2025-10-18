require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Function to update passwords in a database
async function updatePasswords(connectionString, dbName) {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    console.log(`\n🔐 Updating passwords in ${dbName}...\n`);
    
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    const result = await client.query(
      `UPDATE public.user_account 
       SET password_hash = $1 
       RETURNING user_id, username, role`,
      [hashedPassword]
    );
    
    console.log(`✅ Updated ${result.rowCount} user passwords in ${dbName}\n`);
    console.log('Updated users:');
    result.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });
    
    console.log(`\n🔑 Default password: ${defaultPassword}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${dbName}:`, error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

(async () => {
  try {
    // 1. Update LOCAL database
    const localConnectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    await updatePasswords(localConnectionString, 'LOCAL DATABASE');
    
    // 2. Update RENDER database (if DATABASE_URL is set)
    if (process.env.DATABASE_URL) {
      console.log('\n' + '='.repeat(60));
      await updatePasswords(process.env.DATABASE_URL, 'RENDER DATABASE');
    } else {
      console.log('\n⚠️  DATABASE_URL not found in .env');
      console.log('To update Render database, add this to your .env file:');
      console.log('DATABASE_URL=your-render-connection-string');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Password update complete!\n');
    console.log('You can now login with:');
    console.log('  Username: manager_kandy (or any other username)');
    console.log('  Password: password123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
})();
