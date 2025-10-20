const { pool } = require('./config/database');

async function checkAndFixEmployees() {
  const client = await pool.connect();
  try {
    // 1. Check existing branches
    console.log('📍 Checking branches...');
    const branchesResult = await client.query('SELECT * FROM branch ORDER BY branch_id');
    console.log(`Found ${branchesResult.rows.length} branches:`);
    branchesResult.rows.forEach(b => console.log(`  - ID: ${b.branch_id}, Name: ${b.branch_name}`));
    
    if (branchesResult.rows.length === 0) {
      console.error('❌ No branches found! Please create branches first.');
      return;
    }
    
    const firstBranchId = branchesResult.rows[0].branch_id;
    const secondBranchId = branchesResult.rows.length > 1 ? branchesResult.rows[1].branch_id : firstBranchId;
    
    // 2. Check users and their employee records
    console.log('\n👥 Checking users...');
    const usersResult = await client.query(`
      SELECT u.user_id, u.username, u.role, e.employee_id, e.branch_id, e.name
      FROM user_account u
      LEFT JOIN employee e ON u.user_id = e.user_id
      ORDER BY u.role, u.username
    `);
    
    console.log(`\nFound ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(u => {
      const empInfo = u.employee_id ? `Employee ID: ${u.employee_id}, Branch: ${u.branch_id}` : 'No employee record';
      console.log(`  - ${u.username} (${u.role}): ${empInfo}`);
    });
    
    // 3. Insert missing employee records
    console.log('\n🔧 Fixing missing employee records...');
    
    const employeeData = [
      { username: 'accountant', name: 'David Accountant', email: 'accountant@hotel.com', contact: '+94771234570', branch_id: firstBranchId },
      { username: 'manager', name: 'John Manager', email: 'manager@hotel.com', contact: '+94771234567', branch_id: firstBranchId },
      { username: 'reception', name: 'Sarah Receptionist', email: 'reception@hotel.com', contact: '+94771234568', branch_id: firstBranchId },
      { username: 'staff1', name: 'Mike Staff', email: 'staff1@hotel.com', contact: '+94771234569', branch_id: secondBranchId }
    ];
    
    for (const emp of employeeData) {
      // Check if user exists
      const userCheck = await client.query(
        'SELECT user_id FROM user_account WHERE username = $1',
        [emp.username]
      );
      
      if (userCheck.rows.length === 0) {
        console.log(`  ⚠️ User '${emp.username}' not found. Skipping.`);
        continue;
      }
      
      const userId = userCheck.rows[0].user_id;
      
      // Check if employee record exists
      const empCheck = await client.query(
        'SELECT employee_id FROM employee WHERE user_id = $1',
        [userId]
      );
      
      if (empCheck.rows.length > 0) {
        console.log(`  ℹ️ Employee record for '${emp.username}' already exists.`);
        continue;
      }
      
      // Insert employee record
      await client.query(
        `INSERT INTO employee (user_id, branch_id, name, email, contact_no)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, emp.branch_id, emp.name, emp.email, emp.contact]
      );
      
      console.log(`  ✅ Created employee record for '${emp.username}' (Branch ID: ${emp.branch_id})`);
    }
    
    // 4. Verify final state
    console.log('\n📊 Final verification...');
    const finalCheck = await client.query(`
      SELECT u.username, u.role, e.branch_id, b.branch_name
      FROM user_account u
      LEFT JOIN employee e ON u.user_id = e.user_id
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      WHERE u.role != 'Admin'
      ORDER BY u.username
    `);
    
    console.log('\nNon-admin users and their branches:');
    finalCheck.rows.forEach(u => {
      const branchInfo = u.branch_id ? `${u.branch_name} (ID: ${u.branch_id})` : '❌ NO BRANCH ASSIGNED';
      console.log(`  - ${u.username} (${u.role}): ${branchInfo}`);
    });
    
    console.log('\n✅ Employee setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkAndFixEmployees();
