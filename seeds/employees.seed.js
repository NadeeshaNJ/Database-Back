const { Employee, User, Branch } = require('../models');

/**
 * Seed employee records for staff users
 * Links users to branches and provides employee information
 */
const seedEmployees = async () => {
  try {
    console.log('👔 Seeding employees...');
    
    // First, get the branches and users
    const branches = await Branch.findAll();
    if (branches.length === 0) {
      console.warn('⚠️ No branches found. Please seed branches first.');
      return;
    }

    // Define employee data for existing users
    const employeesData = [
      {
        username: 'manager',
        name: 'John Manager',
        email: 'manager@hotel.com',
        contact_no: '+94771234567',
        branch_id: branches[0].branch_id // Assign to first branch
      },
      {
        username: 'reception',
        name: 'Sarah Receptionist',
        email: 'reception@hotel.com',
        contact_no: '+94771234568',
        branch_id: branches[0].branch_id // Assign to first branch
      },
      {
        username: 'accountant',
        name: 'David Accountant',
        email: 'accountant@hotel.com',
        contact_no: '+94771234570',
        branch_id: branches[0].branch_id // Assign to first branch
      },
      {
        username: 'staff1',
        name: 'Mike Staff',
        email: 'staff1@hotel.com',
        contact_no: '+94771234569',
        branch_id: branches.length > 1 ? branches[1].branch_id : branches[0].branch_id // Assign to second branch if exists
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const empData of employeesData) {
      // Find the user by username
      const user = await User.findOne({ 
        where: { username: empData.username } 
      });

      if (!user) {
        console.warn(`⚠️ User '${empData.username}' not found. Skipping employee creation.`);
        skippedCount++;
        continue;
      }

      // Check if employee record already exists
      const existingEmployee = await Employee.findOne({
        where: { user_id: user.user_id }
      });

      if (existingEmployee) {
        console.log(`ℹ️ Employee record for '${empData.username}' already exists. Skipping.`);
        skippedCount++;
        continue;
      }

      // Create employee record
      await Employee.create({
        user_id: user.user_id,
        branch_id: empData.branch_id,
        name: empData.name,
        email: empData.email,
        contact_no: empData.contact_no
      });

      console.log(`✅ Created employee record for '${empData.username}' (Branch ID: ${empData.branch_id})`);
      createdCount++;
    }

    console.log(`✅ Employee seeding complete: ${createdCount} created, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    throw error;
  }
};

module.exports = seedEmployees;
