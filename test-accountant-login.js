const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function testAccountantLogin() {
  const client = await pool.connect();
  try {
    // Simulate login for accountant_colombo
    const username = 'accountant_colombo';
    
    const query = `
        SELECT
            u.user_id,
            u.username,
            u.password_hash,
            u.role,
            e.employee_id,
            e.branch_id,
            e.name as employee_name,
            b.branch_name,
            u.guest_id,
            g.email AS guest_email
        FROM public.user_account u
        LEFT JOIN public.employee e ON u.user_id = e.user_id
        LEFT JOIN public.branch b ON e.branch_id = b.branch_id
        LEFT JOIN public.guest g ON u.guest_id = g.guest_id
        WHERE 
            u.username = $1
            OR e.email = $1
            OR g.email = $1
    `;

    const result = await client.query(query, [username]);
    const user = result.rows[0];

    if (!user) {
      console.log(`❌ User '${username}' not found`);
      return;
    }

    console.log('\n✅ User Found:');
    console.log('--------------------------------------------------');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('Employee ID:', user.employee_id);
    console.log('Branch ID:', user.branch_id);
    console.log('Branch Name:', user.branch_name);
    console.log('Employee Name:', user.employee_name);
    console.log('--------------------------------------------------');
    
    // Check what would be in the JWT payload
    const payload = {
      userId: user.user_id,
      role: user.role,
      employeeId: user.employee_id || null,
      branchId: user.branch_id || null
    };
    
    console.log('\n🔐 JWT Payload would be:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Check what frontend expects
    console.log('\n📋 Frontend BranchContext would see:');
    console.log(`- user.role: "${user.role}"`);
    console.log(`- user.branch_id: ${user.branch_id}`);
    console.log(`- isLocked calculation: user.role !== 'Admin' && user.branch_id = ${user.role !== 'Admin' && user.branch_id ? 'true' : 'false'}`);
    
    if (user.role !== 'Admin' && user.branch_id) {
      console.log(`\n✅ User SHOULD be locked to branch ${user.branch_id} (${user.branch_name})`);
      console.log('✅ Navbar should show BADGE, not dropdown');
    } else {
      console.log(`\n❌ User would NOT be locked (role: ${user.role}, branch_id: ${user.branch_id})`);
      console.log('❌ Navbar would show dropdown');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

testAccountantLogin();
