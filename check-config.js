#!/usr/bin/env node
require('dotenv').config();

console.log('\n🔍 CHECKING BACKEND CONFIGURATION...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:3000 (default)'}`);

// Check required files
const fs = require('fs');
const path = require('path');

console.log('\n📁 Required Files:');
const requiredFiles = [
  'app.js',
  'server.js',
  'middleware/auth.js',
  'middleware/errorHandler.js',
  'routers/auth.js',
  'controllers/authcontroller.js',
  'config/database.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Test database connection
console.log('\n🗄️  Testing Database Connection...');
const { sequelize } = require('./config/database');

sequelize.authenticate()
  .then(() => {
    console.log('   ✅ Database connection successful');
    return sequelize.close();
  })
  .then(() => {
    console.log('\n' + '='.repeat(50));
    if (allFilesExist) {
      console.log('✅ All checks passed! Ready to start server.');
      console.log('\n💡 To start the server, run:');
      console.log('   npm start');
      console.log('   or');
      console.log('   node server.js');
    } else {
      console.log('❌ Some files are missing. Please check above.');
    }
    console.log('='.repeat(50) + '\n');
    process.exit(0);
  })
  .catch(err => {
    console.log('   ❌ Database connection failed:');
    console.log('   ', err.message);
    console.log('\n' + '='.repeat(50));
    console.log('❌ Database connection issue. Check your .env file.');
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  });
