const { sequelize } = require('./config/database');

async function testEmployeeQuery() {
  try {
    console.log('🔍 Testing Direct SQL Query for Employee Data\n');

    // Test 1: Simple employee query
    console.log('1. Direct SQL Query - All Employees:');
    const [employees] = await sequelize.query(`
      SELECT 
        e.employee_id,
        e.user_id,
        e.branch_id,
        e.name,
        e.email,
        e.contact_no,
        b.branch_name,
        b.address as branch_address,
        u.username,
        u.role
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN user_account u ON e.user_id = u.user_id
      ORDER BY e.employee_id
      LIMIT 10
    `);
    
    console.log(`   Found ${employees.length} employees`);
    console.log('   Data:', JSON.stringify(employees, null, 2));

    // Test 2: Query with filter by branch
    console.log('\n2. Employees for Branch 1 (Colombo):');
    const [colomboEmployees] = await sequelize.query(`
      SELECT 
        e.employee_id,
        e.name,
        e.email,
        b.branch_name,
        u.role
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN user_account u ON e.user_id = u.user_id
      WHERE e.branch_id = 1
    `);
    
    console.log(`   Found ${colomboEmployees.length} employees`);
    colomboEmployees.forEach(emp => {
      console.log(`   - ${emp.name} (${emp.role}) at ${emp.branch_name}`);
    });

    // Test 3: Count by role
    console.log('\n3. Employee Count by Role:');
    const [roleStats] = await sequelize.query(`
      SELECT 
        u.role,
        COUNT(*) as count
      FROM employee e
      LEFT JOIN user_account u ON e.user_id = u.user_id
      GROUP BY u.role
      ORDER BY count DESC
    `);
    
    roleStats.forEach(stat => {
      console.log(`   - ${stat.role}: ${stat.count} employees`);
    });

    // Test 4: Get specific employee with all details
    console.log('\n4. Detailed info for Employee ID 7:');
    const [employeeDetail] = await sequelize.query(`
      SELECT 
        e.*,
        b.branch_name,
        b.branch_code,
        b.contact_number as branch_contact,
        b.address as branch_address,
        u.username,
        u.role,
        u.guest_id
      FROM employee e
      LEFT JOIN branch b ON e.branch_id = b.branch_id
      LEFT JOIN user_account u ON e.user_id = u.user_id
      WHERE e.employee_id = 7
    `);
    
    if (employeeDetail.length > 0) {
      console.log('   Employee Details:', JSON.stringify(employeeDetail[0], null, 2));
    }

    console.log('\n✅ All SQL queries completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error testing employee queries:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEmployeeQuery();
