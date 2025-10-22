const { Employee, Branch, User } = require('./models');

async function testEmployees() {
  try {
    console.log('🔍 Testing Employee Table...\n');

    // Test 1: Get all employees
    console.log('1. Fetching all employees...');
    const employees = await Employee.findAll({
      limit: 5
    });
    console.log(`   Found ${employees.length} employees`);
    console.log('   Raw data:', JSON.stringify(employees, null, 2));

    // Test 2: Get employees with associations
    console.log('\n2. Fetching employees with Branch and User associations...');
    const employeesWithAssoc = await Employee.findAll({
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['branch_id', 'branch_name', 'address', 'contact_number']
        },
        {
          model: User,
          as: 'User',
          attributes: ['user_id', 'username', 'role']
        }
      ],
      limit: 5
    });
    console.log(`   Found ${employeesWithAssoc.length} employees with associations`);
    
    if (employeesWithAssoc.length > 0) {
      console.log('\n   Sample employee data:');
      employeesWithAssoc.forEach(emp => {
        console.log(`   - ID: ${emp.employee_id}, Name: ${emp.name}, Branch: ${emp.Branch?.branch_name || 'N/A'}, Role: ${emp.User?.role || 'N/A'}`);
      });
    }

    // Test 3: Check table structure
    console.log('\n3. Checking employee table structure...');
    const { sequelize } = require('./config/database');
    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employee'
      ORDER BY ordinal_position
    `);
    console.log('   Table columns:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Test 4: Count total employees
    console.log('\n4. Total employee count...');
    const count = await Employee.count();
    console.log(`   Total: ${count} employees`);

    console.log('\n✅ Employee table tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing employees:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEmployees();
