// In middleware/authorize.js

// The actual authorization logic is in auth.js
const { authorizeRoles } = require('./auth');

// Export authorizeRoles under the name 'authorize' to satisfy the router import
module.exports = {
    authorize: authorizeRoles 
};