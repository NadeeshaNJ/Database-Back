// const { executeQuery, executeTransaction } = require('../config/database');
// const { asyncHandler } = require('../middleware/errorHandler');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { USER_ROLE } = require('../utils/enums');

// /**
//  * Login user
//  */
// const login = asyncHandler(async (req, res) => {
//     const { username, password } = req.body;

//     // Find user by username or email
//     const query = `
//                     SELECT
//                         u.user_id,
//                         u.username,
//                         u.password_hash,
//                         u.role,
//                         e.employee_id,
//                         e.branch_id,
//                         u.guest_ID,
//                     FROM
//                         public.user_account u
//                     LEFT JOIN
//                         public.employee e ON u.user_id = e.user_id
//                     WHERE
//                         (u.username = $1) -- ✅ FIX: Check username
                        
//     `;

//     const result = await executeQuery(query, [username]);
//     const user = result.rows[0];

//     if (!user) {
//         return res.status(401).json({
//             success: false,
//             error: 'Invalid credentials'
//         });
//     }

//     // CRITICAL FIX: Use user.password_hash from the SQL result, not user.password
//     const isValidPassword = await bcrypt.compare(password, user.password_hash); 
//     if (!isValidPassword) {
//         return res.status(401).json({
//             success: false,
//             error: 'Invalid credentials'
//         });
//     }

//     // Generate JWT token (Logic is fine, using fields retrieved from query)
//     const token = jwt.sign(
//         {
//             userId: user.user_id,
//             role: user.role,
//             employeeId: user.employee_id,
//             branchId: user.branch_id,
//             guestId: user.guest_ID
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
//     );

//     // CRITICAL FIX: Remove password_hash from response
//     const { password_hash: _, ...userWithoutPassword } = user;

//     res.json({
//         success: true,
//         data: {
//             user: userWithoutPassword,
//             token
//         }
//     });
// });

// /**
//  * Register new user
//  */
// const register = asyncHandler(async (req, res) => {
//     const {
//         username,
//         email,
//         password,
//         role,
//         guest_id,
//         full_name,
//         contact_no,
//         branch_id
//     } = req.body;
     
//     // Start transaction
//     const queries = [];

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 12);

//     // Insert user query
//     // CRITICAL FIX: Correct table name (user_account) and password column (password_hash)
//     queries.push({
//         text: `
//             INSERT INTO user_account (
//                 username,
//                 password_hash,
//                 role,
//                 guest_id
//             )
//             VALUES ($1, $2, $3, $4)
//             RETURNING user_id
//         `,
//         params: [username, hashedPassword, role, guest_id]
//     });

//     // If role is not customer, create employee record
//     if (role !== USER_ROLE.CUSTOMER) {
//         queries.push({
//             text: `
//                 INSERT INTO employee (
//                     user_id,
//                     branch_id,
//                     name,
//                     email,
//                     contact_no
//                 )
//                 VALUES (
//                     (SELECT user_id FROM user_account WHERE username = $1),--latest update
//                     $3,
//                     $4,
//                     $2,
//                     $5
//                 )
//             `,
//             params: [username,email, branch_id, full_name, contact_no]
//         });
//     }

//     try {
//         // Execute transaction
//         await executeTransaction(queries);

//         res.status(201).json({
//             success: true,
//             message: 'User registered successfully'
//         });
//     } catch (error) {
//         // ... (Error handling logic is fine)
//         if (error.code === '23505') { // PostgreSQL unique violation code
//             return res.status(400).json({
//                 success: false,
//                 error: 'Username or email already exists'
//             });
//         }
//         throw error;
//     }
// });

// /**
//  * Get current user profile
//  */
// const getProfile = asyncHandler(async (req, res) => {
//     const userId = req.user.userId;

//     const query = `
//         SELECT 
//             u.user_id,
//             u.username,
//             u.email,
//             u.role,
//             u.created_at,
//             e.employee_id,
//             e.branch_id,
//             e.name as full_name,
//             e.contact_no,
//             b.branch_name
//         FROM user_account u -- CRITICAL FIX: Correct table name
//         LEFT JOIN employee e ON u.user_id = e.user_id
//         LEFT JOIN branches b ON e.branch_id = b.branch_id
//         WHERE u.user_id = $1 AND u.is_active = true
//     `;

//     // ... (rest of the function is fine)
// // ... (rest of the function is fine)

//     const result = await executeQuery(query, [userId]);
//     const user = result.rows[0];

//     if (!user) {
//         return res.status(404).json({
//             success: false,
//             error: 'User not found'
//         });
//     }

//     res.json({
//         success: true,
//         data: user
//     });
// });

// /**
//  * Update user profile
//  */
// const updateProfile = asyncHandler(async (req, res) => {
//     const userId = req.user.userId;
//     const {
//         username,
//         email,
//         current_password,
//         new_password,
//         full_name,
//         contact_no
//     } = req.body;

//     // Start transaction
//     const queries = [];

//     // If changing password, verify current password
//     if (new_password) {
//         const userResult = await executeQuery(
//             // CRITICAL FIX: Correct table name (user_account) and password column (password_hash)
//             'SELECT password_hash FROM user_account WHERE user_id = $1',
//             [userId]
//         );

//         // CRITICAL FIX: Use password_hash from the query result
//         const isValidPassword = await bcrypt.compare(
//             current_password,
//             userResult.rows[0].password_hash
//         );

//         if (!isValidPassword) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Current password is incorrect'
//             });
//         }

//         // Hash new password
//         const hashedPassword = await bcrypt.hash(new_password, 10);

//         queries.push({
//             text: `
//                 UPDATE user_account -- CRITICAL FIX: Correct table name
//                 SET password_hash = $1 -- CRITICAL FIX: Correct column name
//                 WHERE user_id = $2
//             `,
//             params: [hashedPassword, userId]
//         });
//     }

//     // Update user info
//     queries.push({
//         text: `
//             UPDATE user_account -- CRITICAL FIX: Correct table name
//             SET 
//                 username = COALESCE($1, username),
//                 email = COALESCE($2, email),
//                 updated_at = NOW()
//             WHERE user_id = $3
//         `,
//         params: [username, email, userId]
//     });

//     // Update employee info if exists
//     if (full_name || contact_no) {
//         queries.push({
//             text: `
//                 UPDATE employees
//                 SET 
//                     name = COALESCE($1, name),
//                     contact_no = COALESCE($2, contact_no),
//                     updated_at = NOW()
//                 WHERE user_id = $3
//             `,
//             params: [full_name, contact_no, userId]
//         });
//     }

//     try {
//         await executeTransaction(queries);

//         res.json({
//             success: true,
//             message: 'Profile updated successfully'
//         });
//     } catch (error) {
//         if (error.code === '23505') {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Username or email already exists'
//             });
//         }
//         throw error;
//     }
// });

// module.exports = {
//     login,
//     register,
//     getProfile,
//     updateProfile
// };

/*update 2*/

const { executeQuery, executeTransaction,pool } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { USER_ROLE,GENDER } = require('../utils/enums');


/**
 * Login user
 */
// const login = asyncHandler(async (req, res) => {
//     const { username, password } = req.body;

//     // Find user by username or email
//     const query = `
//                     SELECT
//                         u.user_id,
//                         u.username,
//                         u.password_hash,
//                         u.role,
//                         e.employee_id,
//                         e.branch_id,
//                         u.guest_id,             
//                         g.email AS guest_email  
//                     FROM
//                         public.user_account u
//                     LEFT JOIN
//                         public.employee e ON u.user_id = e.user_id
//                     LEFT JOIN
//                         public.guest g ON u.guest_id = g.guest_id -- ✅ FIX: Join guest table!
//                     WHERE
//                         u.username = $1 
//                         OR e.email = $1         -- Login by employee email
//                         OR g.email = $1         -- ✅ FIX: Login by customer email
//     `;

//     const result = await executeQuery(query, [username]);
//     const user = result.rows[0];

//     if (!user) {
//         return res.status(401).json({
//             success: false,
//             error: 'Invalid credentials'
//         });
//     }

//     const isValidPassword = await bcrypt.compare(password, user.password_hash); 
//     if (!isValidPassword) {
//         return res.status(401).json({
//             success: false,
//             error: 'Invalid credentials'
//         });
//     }

//     // // Generate JWT token
//     // const token = jwt.sign(
//     //     {
//     //         userId: user.user_id,
//     //         role: user.role,
//     //         employeeId: user.employee_id || null, // Handle null for non-staff
//     //         branchId: user.branch_id || null,     // Handle null for non-staff
//     //         guestId: user.guest_id || null        // ✅ FIX 4: Corrected casing in JWT payload
//     //     },
//     //     process.env.JWT_SECRET,
//     //     { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
//     // );
    
//     // Generate JWT token
    
//     const token = jwt.sign(
//         {
//             userId: user.user_id,
//             role: user.role,
//             employeeId: user.employee_id || null,
//             branchId: user.branch_id || null,
//             guestId: user.guest_id || null        // ⬅️ FIX 2: Ensure guest_id is included here
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
//     );

//     // Remove password_hash from response
//     const { password_hash: _, ...userWithoutPassword } = user;

//     res.json({
//         success: true,
//         data: {
//             user: userWithoutPassword,
//             token
//         }
//     });
// });

// /**
//  * Register new user
//  */
// const register = asyncHandler(async (req, res) => {
//     const {
//         username,
//         email,
//         password,
//         role,
//         guest_id, // ✅ FIX 5: Lowercase variable name
//         full_name,
//         contact_no,
//         branch_id
//     } = req.body;
     
//     // Start transaction
//     const queries = [];

//     // Hash password (must be 12 rounds for consistency)
//     const hashedPassword = await bcrypt.hash(password, 12);

//     // 1. Insert into user_account
//     queries.push({
//         text: `
//             INSERT INTO user_account (
//                 username,
//                 password_hash,
//                 role,
//                 guest_id             -- ✅ FIX 6: Use correct column casing
//             )
//             VALUES ($1, $2, $3, $4)
//             RETURNING user_id
//         `,
//         params: [username, hashedPassword, role, guest_id]
//     });

//     // 2. Insert into employee (if staff role)
//     if (role !== USER_ROLE.CUSTOMER) {
//         queries.push({
//             text: `
//                 INSERT INTO employee (
//                     user_id,
//                     branch_id,
//                     name,
//                     email,
//                     contact_no
//                 )
//                 VALUES (
//                     (SELECT user_id FROM user_account WHERE username = $1),
//                     $2, -- branch_id
//                     $3, -- full_name
//                     $4, -- email
//                     $5  -- contact_no
//                 )
//             `,
//             // ✅ FIX 7: Parameter order fixed to match SQL values ($1..$5)
//             params: [username, branch_id, full_name, email, contact_no] 
//         });
//     }

//     try {
//         await executeTransaction(queries);
//         res.status(201).json({ success: true, message: 'User registered successfully' });
//     } catch (error) {
//         if (error.code === '23505') { 
//             return res.status(400).json({ success: false, error: 'Username or email already exists' });
//         }
//         throw error;
//     }
// });

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // 🔍 1. Look up user by username or email (covers employees & customers)
    const query = `
        SELECT
            u.user_id,
            u.username,
            u.password_hash,
            u.role,
            e.employee_id,
            e.branch_id,
            e.full_name AS employee_name,
            u.guest_id,
            g.email AS guest_email,
            g.guest_first_name,
            g.guest_last_name,
            CONCAT(g.guest_first_name, ' ', g.guest_last_name) AS guest_full_name
        FROM public.user_account u
        LEFT JOIN public.employee e ON u.user_id = e.user_id
        LEFT JOIN public.guest g ON u.guest_id = g.guest_id
        WHERE 
            u.username = $1
            OR e.email = $1
            OR g.email = $1
    `;

    const result = await executeQuery(query, [username]);
    const user = result.rows[0];

    // 🔍 DEBUG: Log what we got from database
    console.log('🔍 Login query result for:', username);
    console.log('  - user_id:', user?.user_id);
    console.log('  - username:', user?.username);
    console.log('  - role:', user?.role);
    console.log('  - employee_id:', user?.employee_id);
    console.log('  - branch_id:', user?.branch_id);
    console.log('  - Full user object:', user);

    // ❌ 2. Invalid username/email
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    // 🔑 3. Validate password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    // 🧾 4. Prepare JWT payload dynamically
    const payload = {
        userId: user.user_id,
        role: user.role,
        employeeId: user.employee_id || null,
        branchId: user.branch_id || null
    };

    // ✅ Include guestId only for Customer users
    if (user.role === 'Customer' && user.guest_id) {
        payload.guestId = user.guest_id;
    }

    // 🔐 5. Sign JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // 🚫 6. Remove password before sending user data
    const { password_hash, ...safeUser } = user;

    // Add full_name field based on role
    if (user.role === 'Customer' && user.guest_full_name) {
        safeUser.full_name = user.guest_full_name;
    } else if (user.employee_name) {
        safeUser.full_name = user.employee_name;
    }

    // 🎯 7. Send success response
    res.status(200).json({
        success: true,
        data: {
            user: safeUser,
            token
        }
    });
});

/**
 * 🔑 Staff Registration (user_account + employee tables)
 * This function handles the logic for /register/staff
 */
const registerStaffController = asyncHandler(async (req, res) => {
    const {
        username,
        email,
        password,
        role,
        full_name,
        contact_no,
        branch_id
        // guest_id is ignored for staff
    } = req.body;
     
    const queries = [];
    const hashedPassword = await bcrypt.hash(password, 12); // Standardized to 12 rounds

    // 1. Insert into user_account
    queries.push({
        text: `
            INSERT INTO user_account (username, password_hash, role)
            VALUES ($1, $2, $3)
            RETURNING user_id
        `,
        params: [username, hashedPassword, role]
    });

    // 2. Insert into employee table
    queries.push({
        text: `
            INSERT INTO employee (user_id, branch_id, name, email, contact_no)
            VALUES (
                (SELECT user_id FROM user_account WHERE username = $1),
                $2, -- branch_id
                $3, -- full_name
                $4, -- email
                $5  -- contact_no
            )
        `,
        // Parameter order fixed: $1=username, $2=branch_id, $3=full_name, $4=email, $5=contact_no
        params: [username, branch_id, full_name, email, contact_no] 
    });

    try {
        await executeTransaction(queries);
        res.status(201).json({ success: true, message: 'Staff user registered successfully' });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'Username or email/contact info already exists' });
        }
        throw error;
    }
});


/**
 * 👤 Customer Registration (guest + user_account + customer tables)
 * This function handles the logic for /register/customer
 */
const registerCustomerController = asyncHandler(async (req, res) => {
    const {
        username,
        email,
        password,
        role, // Should be 'Customer'
        full_name,
        contact_no,
        nic,
        gender,
        date_of_birth,
        address,
        nationality
    } = req.body;
     
    const queries = [];
    const hashedPassword = await bcrypt.hash(password, 12); 

    // 1. Insert into GUEST table (Guest profile created first)
    queries.push({
        text: `
            INSERT INTO public.guest (
                nic, full_name, email, phone, gender, 
                date_of_birth, address, nationality
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
        params: [
            nic, 
            full_name, 
            email, 
            contact_no, // maps to phone
            gender, 
            date_of_birth, 
            address, 
            nationality
        ]
    });

    // 2. Insert into USER_ACCOUNT, linking to the new guest.
    queries.push({
        text: `
            INSERT INTO public.user_account (username, password_hash, role, guest_id)
            VALUES (
                $1, 
                $2, 
                $3, 
                (SELECT guest_id FROM public.guest WHERE email = $4) -- Links user_account to guest
            );
        `,
        params: [username, hashedPassword, role, email]
    });
    
    // 3. Insert into CUSTOMER table, linking the user and guest.
    queries.push({
        text: `
            INSERT INTO public.customer (user_id, guest_id)
            VALUES (
                (SELECT user_id FROM public.user_account WHERE username = $1),
                (SELECT guest_id FROM public.guest WHERE email = $2)
            );
        `,
        params: [username, email]
    });


    try {
        await executeTransaction(queries);
        res.status(201).json({ success: true, message: 'Customer user registered successfully' });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'Username or email/contact info already exists' });
        }
        throw error;
    }
});

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const query = `
        SELECT 
            u.user_id,
            u.username,
            u.role,           -- ✅ FIX 8: Removed u.email and u.created_at (not on user_account)
            e.employee_id,
            e.branch_id,
            e.name as full_name,
            e.contact_no,
            b.branch_name
        FROM public.user_account u
        LEFT JOIN employee e ON u.user_id = e.user_id -- ✅ FIX 9: Used 'employee' table (singular)
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE u.user_id = $1
        -- ✅ FIX 10: Removed AND u.is_active = true (not on user_account)
    `;

    const result = await executeQuery(query, [userId]);
    const user = result.rows[0];

    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
});

/**
 * Update user profile
 */

/**
 * 🛠️ Update Staff Profile (user_account + employee)
 */
// const updateStaffProfileController = asyncHandler(async (req, res) => {
//     // Get the authenticated user's ID from the JWT payload
//     const userId = req.user.userId; 
//     const {
//         username,
//         email,
//         current_password,
//         new_password,
//         full_name,
//         contact_no
//     } = req.body;

//     const queries = [];

//     // 1. Handle Password Update (Applies to user_account)
//     if (new_password) {
//         const userResult = await executeQuery('SELECT password_hash FROM public.user_account WHERE user_id = $1', [userId]);

//         if (!userResult.rows[0] || !(await bcrypt.compare(current_password, userResult.rows[0].password_hash))) {
//             return res.status(401).json({ success: false, error: 'Current password is incorrect' });
//         }

//         const hashedPassword = await bcrypt.hash(new_password, 12);

//         queries.push({
//             text: `UPDATE public.user_account SET password_hash = $1 WHERE user_id = $2`,
//             params: [hashedPassword, userId]
//         });
//     }

//     // 2. Update user_account info (Username only)
//     if (username) {
//         queries.push({
//             text: `
//                 UPDATE public.user_account 
//                 SET username = COALESCE($1, username) 
//                 WHERE user_id = $2
//             `,
//             params: [username, userId]
//         });
//     }

//     // 3. Update employee info (employee table)
//     if (full_name || contact_no || email) {
//         queries.push({
//             text: `
//                 UPDATE public.employee
//                 SET 
//                     name = COALESCE($1, name),
//                     contact_no = COALESCE($2, contact_no),
//                     email = COALESCE($3, email)
//                 WHERE user_id = $4
//             `,
//             params: [full_name, contact_no, email, userId]
//         });
//     }
    
//     // Execute all update queries as a transaction
//     try {
//         await executeTransaction(queries);
//         res.json({ success: true, message: 'Staff profile updated successfully' });
//     } catch (error) {
//         if (error.code === '23505') {
//             return res.status(400).json({ success: false, error: 'Username or employee email already exists' });
//         }
//         throw error;
//     }
// });

/**
 * 🛠️ Update Staff Profile (user_account + employee)
 */
// const updateStaffProfileController = asyncHandler(async (req, res) => {
//     // Get the authenticated user's ID from the JWT payload
//     const userId = req.user.userId; 
//     const {
//         username,
//         email,
//         current_password,
//         new_password,
//         full_name,
//         contact_no
//     } = req.body;

//     const queries = [];

//     // 1. Handle Password Update (user_account)
//     if (new_password) {
//         // Query must use the specific table name 'user_account'
//         const userResult = await executeQuery('SELECT password_hash FROM public.user_account WHERE user_id = $1', [userId]);

//         if (!userResult.rows[0] || !(await bcrypt.compare(current_password, userResult.rows[0].password_hash))) {
//             return res.status(401).json({ success: false, error: 'Current password is incorrect' });
//         }

//         const hashedPassword = await bcrypt.hash(new_password, 12);

//         queries.push({
//             text: `UPDATE public.user_account SET password_hash = $1 WHERE user_id = $2`,
//             params: [hashedPassword, userId]
//         });
//     }

//     // 2. Update user_account info (Username only)
//     if (username) {
//         queries.push({
//             text: `
//                 UPDATE public.user_account 
//                 SET username = COALESCE($1, username) 
//                 WHERE user_id = $2
//             `,
//             params: [username, userId]
//         });
//     }

//     // 3. Update employee info (employee table)
//     // NOTE: Maps input 'full_name' to DB column 'name', and input 'contact_no' to DB column 'contact_no'.
//     if (full_name || contact_no || email) {
//         queries.push({
//             text: `
//                 UPDATE public.employee
//                 SET 
//                     name = COALESCE($1, name),
//                     contact_no = COALESCE($2, contact_no),
//                     email = COALESCE($3, email)
//                 WHERE user_id = $4
//             `,
//             // Parameters align with SQL: $1=full_name, $2=contact_no, $3=email, $4=userId
//             params: [full_name, contact_no, email, userId]
//         });
//     }
    
//     // Execute all update queries as a transaction
//     try {
//         await executeTransaction(queries);
//         return res.json({ success: true, message: 'Staff profile updated successfully' });
//     } catch (error) {
//         if (error.code === '23505') { // Handles unique constraint violations
//             return res.status(400).json({ success: false, error: 'Username or employee email already exists' });
//         }
//         throw error;
//     }
// });

// const updateStaffProfileController = asyncHandler(async (req, res) => {
//     const userId = req.user.userId;
//     const {
//         username,
//         email,
//         current_password,
//         new_password,
//         first_name,
//         last_name,
//         contact_no,
//         address,
//         role
//     } = req.body;

//     const queries = [];

//     // 1️⃣ Handle password update
//     if (new_password) {
//         const userResult = await executeQuery(
//             'SELECT password_hash FROM public.user_account WHERE user_id = $1',
//             [userId]
//         );

//         if (
//             !userResult.rows[0] ||
//             !(await bcrypt.compare(current_password, userResult.rows[0].password_hash))
//         ) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Current password is incorrect'
//             });
//         }

//         const hashedPassword = await bcrypt.hash(new_password, 12);
//         queries.push({
//             text: 'UPDATE public.user_account SET password_hash = $1 WHERE user_id = $2',
//             params: [hashedPassword, userId]
//         });
//     }

//     // 2️⃣ Update username and role (optional)
//     if (username || role) {
//         queries.push({
//             text: `
//                 UPDATE public.user_account 
//                 SET 
//                     username = COALESCE($1, username),
//                     role = COALESCE($2, role)
//                 WHERE user_id = $3
//             `,
//             params: [username, role, userId]
//         });
//     }

//     // 3️⃣ Update employee table info
//     if (first_name || last_name || contact_no || email || address) {
//         queries.push({
//             text: `
//                 UPDATE public.employee
//                 SET 
//                     first_name = COALESCE($1, first_name),
//                     last_name = COALESCE($2, last_name),
//                     contact_no = COALESCE($3, contact_no),
//                     email = COALESCE($4, email),
//                     address = COALESCE($5, address)
//                 WHERE user_id = $6
//             `,
//             params: [first_name, last_name, contact_no, email, address, userId]
//         });
//     }

//     try {
//         await executeTransaction(queries);
//         return res.json({ success: true, message: 'Staff profile updated successfully' });
//     } catch (error) {
//         if (error.code === '23505') {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Username or employee email already exists'
//             });
//         }
//         console.error('❌ Staff profile update error:', error);
//         return res.status(500).json({
//             success: false,
//             error: 'An unexpected error occurred'
//         });
//     }
// });


const updateStaffProfileController = asyncHandler(async (req, res) => {
    const userId = req.user.userId; 
    const {
        username,
        email,
        current_password,
        new_password,
        // ✅ FIX 1: Use the single 'full_name' field for staff (matches earlier registration logic)
        full_name, 
        contact_no,
        // The following fields are not used/updated in the employee table:
        // address, role 
    } = req.body;

    const queries = [];
    
    // 1️⃣ Handle password update
    if (new_password) {
        const userResult = await executeQuery(
            'SELECT password_hash FROM public.user_account WHERE user_id = $1',
            [userId]
        );

        if (
            !userResult.rows[0] ||
            !(await bcrypt.compare(current_password, userResult.rows[0].password_hash))
        ) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);
        queries.push({
            text: 'UPDATE public.user_account SET password_hash = $1 WHERE user_id = $2',
            params: [hashedPassword, userId]
        });
    }

    // 2️⃣ Update username 
    if (username) {
        queries.push({
            text: `
                UPDATE public.user_account 
                SET 
                    username = COALESCE($1, username)
                WHERE user_id = $2
            `,
            params: [username, userId]
        });
    }

    // 3️⃣ Update employee table info (Only fields present on the employee table)
    if (full_name || contact_no || email) {
        queries.push({
            text: `
                UPDATE public.employee
                SET 
                    name = COALESCE($1, name),           -- ✅ FIX 2: Maps full_name directly to 'name' column
                    contact_no = COALESCE($2, contact_no),
                    email = COALESCE($3, email)
                WHERE user_id = $4
            `,
            // Parameters align: $1=full_name, $2=contact_no, $3=email, $4=userId
            params: [full_name, contact_no, email, userId]
        });
    }

    try {
        await executeTransaction(queries);
        return res.json({ success: true, message: 'Staff profile updated successfully' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Username or employee email already exists'
            });
        }
        console.error('❌ Staff profile update error:', error);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred'
        });
    }
});


const updateCustomerProfileController = asyncHandler(async (req, res) => {
    // Note: Assuming 'pool' and 'bcrypt' are correctly imported or scoped.
    const userId = req.user?.userId;
    const { 
        username, 
        password, 
        email, 
        first_name, 
        last_name, 
        phone_number, // User input for phone
        address 
    } = req.body;

    if (!userId) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized: No user ID found in token',
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        // 1. ✅ Data Mapping: Concatenate names and standardize phone variable
        const guestFullName = (first_name && last_name) ? `${first_name} ${last_name}` : first_name || last_name;
        const phone = phone_number; // Map phone_number input to phone column

        // 2. ✅ Check if user exists and is a customer
        const userCheckQuery = `
            SELECT u.user_id, u.role, g.guest_id
            FROM public.user_account u
            LEFT JOIN public.guest g ON u.guest_id = g.guest_id
            WHERE u.user_id = $1
        `;
        const userCheck = await client.query(userCheckQuery, [userId]);

        if (userCheck.rowCount === 0 || userCheck.rows[0].role !== 'Customer') {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Only customers can update their profile',
            });
        }

        // CRITICAL CHECK: Ensure guest_id exists to update the guest table
        const guestId = userCheck.rows[0].guest_id;
        if (!guestId) {
             await client.query('ROLLBACK');
             return res.status(403).json({
                 success: false,
                 error: 'Forbidden: Profile not linked to a guest record',
             });
        }


        // 3. ✅ Update password if provided
        if (password) {
            // Note: Assuming BCRYPT_ROUNDS=12 from your project settings
            const hashedPassword = await bcrypt.hash(password, 12); 
            await client.query(
                `UPDATE public.user_account SET password_hash = $1 WHERE user_id = $2`,
                [hashedPassword, userId]
            );
        }

        // 4. ✅ Update username if provided
        if (username) {
            await client.query(
                `UPDATE public.user_account SET username = $1 WHERE user_id = $2`,
                [username, userId]
            );
        }

        // 5. ✅ Update guest table info (Using correct DB column names)
        await client.query(
            `
            UPDATE public.guest 
            SET 
                email = COALESCE($1, email),
                full_name = COALESCE($2, full_name),  -- CRITICAL FIX 1: Use full_name
                phone = COALESCE($3, phone),          -- CRITICAL FIX 2: Use phone
                address = COALESCE($4, address)
            WHERE guest_id = $5
            `,
            // Parameter list now aligns with the corrected columns and variables
            [email, guestFullName, phone, address, guestId] 
        );

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Customer profile updated successfully',
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error updating customer profile:', error);

        // Enhance error reporting for integrity violations
        if (error.code === '23505') { // PostgreSQL Unique Constraint Violation
             return res.status(400).json({
                 success: false,
                 error: 'Update failed: Email or username already exists.',
             });
        }

        return res.status(500).json({
            success: false,
            error: 'An error occurred while updating the customer profile',
        });
    } finally {
        client.release();
    }
});





// In authcontroller.js, inside updateCustomerProfileController


module.exports = {
    login,
    registerStaffController, 
    registerCustomerController,
    getProfile,
    updateStaffProfileController,
    updateCustomerProfileController
};