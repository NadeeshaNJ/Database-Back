const { executeQuery, executeTransaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { ROOM_STATUS } = require('../utils/enums');
const moment = require('moment');

/**
 * Get all rooms with availability check and filters
 */
const getAllRooms = asyncHandler(async (req, res) => {
    const {
        check_in,
        check_out,
        room_type,
        min_price,
        max_price,
        capacity,
        status,
        branch_id,
        page = 1,
        limit = 100
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 0;

    let query = `
        SELECT 
            r.room_id,
            r.room_number,
            r.status,
            r.branch_id,
            b.branch_name,
            b.branch_code,
            rt.room_type_id,
            rt.name as room_type_name,
            rt.capacity,
            rt.daily_rate,
            rt.amenities,
            CASE 
                WHEN bk.room_id IS NULL THEN true 
                ELSE false 
            END as is_available
        FROM room r
        JOIN room_type rt ON r.room_type_id = rt.room_type_id
        JOIN branch b ON r.branch_id = b.branch_id
        LEFT JOIN (
            SELECT DISTINCT room_id
            FROM booking
            WHERE status NOT IN ('Cancelled', 'Checked-Out')
            ${check_in && check_out ? `
                AND (
                    (check_in_date <= $${++paramIndex} AND check_out_date >= $${++paramIndex})
                    OR (check_in_date <= $${++paramIndex} AND check_out_date >= $${++paramIndex})
                    OR (check_in_date >= $${++paramIndex} AND check_out_date <= $${++paramIndex})
                )
            ` : ''}
        ) bk ON r.room_id = bk.room_id
        WHERE 1=1
    `;

    // Add parameters for date range
    if (check_in && check_out) {
        params.push(
            check_out, check_in,
            check_in, check_out,
            check_in, check_out
        );
    }

    // Room type filter
    if (room_type) {
        query += ` AND rt.name = $${++paramIndex}`;
        params.push(room_type);
    }

    // Status filter
    if (status) {
        query += ` AND r.status = $${++paramIndex}`;
        params.push(status);
    }

    // Branch filter
    if (branch_id) {
        query += ` AND r.branch_id = $${++paramIndex}`;
        params.push(branch_id);
    }

    // Price range filter
    if (min_price) {
        query += ` AND rt.daily_rate >= $${++paramIndex}`;
        params.push(parseFloat(min_price));
    }

    if (max_price) {
        query += ` AND rt.daily_rate <= $${++paramIndex}`;
        params.push(parseFloat(max_price));
    }

    // Capacity filter
    if (capacity) {
        query += ` AND rt.capacity >= $${++paramIndex}`;
        params.push(parseInt(capacity));
    }

    // Add pagination
    query += ` ORDER BY r.room_number LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    // Get total count for pagination
    const countQuery = `
        SELECT COUNT(*) 
        FROM (${query.split('LIMIT')[0]}) as sub
    `;

    const [rooms, countResult] = await Promise.all([
        executeQuery(query, params),
        executeQuery(countQuery, params.slice(0, -2))
    ]);

    const totalRooms = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRooms / limit);

    res.json({
        success: true,
        data: {
            rooms: rooms.rows,
            pagination: {
                total: totalRooms,
                page: parseInt(page),
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

/**
 * Get room by ID with availability info
 */
const getRoomById = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { check_in, check_out } = req.query;

    let query = `
        SELECT 
            r.room_id,
            r.room_number,
            r.status,
            r.branch_id,
            br.branch_name,
            br.branch_code,
            rt.room_type_id,
            rt.name as room_type_name,
            rt.capacity,
            rt.daily_rate,
            rt.amenities,
            CASE 
                WHEN b.booking_id IS NULL THEN true 
                ELSE false 
            END as is_available,
            COALESCE(json_agg(
                json_build_object(
                    'booking_id', b.booking_id,
                    'check_in', b.check_in_date,
                    'check_out', b.check_out_date,
                    'status', b.status
                )
            ) FILTER (WHERE b.booking_id IS NOT NULL), '[]') as bookings
        FROM room r
        JOIN room_type rt ON r.room_type_id = rt.room_type_id
        JOIN branch br ON r.branch_id = br.branch_id
        LEFT JOIN booking b ON r.room_id = b.room_id
            AND b.status NOT IN ('Cancelled', 'Checked-Out')
            ${check_in && check_out ? `
                AND (
                    (b.check_in_date <= $2 AND b.check_out_date >= $3)
                    OR (b.check_in_date <= $4 AND b.check_out_date >= $5)
                    OR (b.check_in_date >= $6 AND b.check_out_date <= $7)
                )
            ` : ''}
        WHERE r.room_id = $1
        GROUP BY r.room_id, r.room_number, r.status, r.branch_id, br.branch_name, br.branch_code, rt.room_type_id, rt.name, rt.capacity, rt.daily_rate, rt.amenities
    `;

    const params = [roomId];
    if (check_in && check_out) {
        params.push(
            check_out, check_in,
            check_in, check_out,
            check_in, check_out
        );
    }

    const result = await executeQuery(query, params);
    
    if (!result.rows[0]) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
});

/**
 * Create new room
 */
const createRoom = asyncHandler(async (req, res) => {
    const { room_number, room_type_id, status = ROOM_STATUS.AVAILABLE } = req.body;

    const query = `
        INSERT INTO room (
            room_number,
            room_type_id,
            status
        )
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    try {
        const result = await executeQuery(query, [
            room_number,
            room_type_id,
            status
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Room number already exists'
            });
        }
        throw error;
    }
});

/**
 * Update room
 */
const updateRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { room_number, room_type_id, status } = req.body;

    const query = `
        UPDATE room
        SET 
            room_number = COALESCE($1, room_number),
            room_type_id = COALESCE($2, room_type_id),
            status = COALESCE($3, status)
        WHERE room_id = $4
        RETURNING *
    `;

    try {
        const result = await executeQuery(query, [
            room_number,
            room_type_id,
            status,
            roomId
        ]);

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Room number already exists'
            });
        }
        throw error;
    }
});

/**
 * Delete room
 */
const deleteRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    // Check if room has any bookings
    const bookingsCheck = await executeQuery(`
        SELECT EXISTS(
            SELECT 1 
            FROM booking 
            WHERE room_id = $1 
            AND status NOT IN ('Cancelled', 'Checked-Out')
        )
    `, [roomId]);

    if (bookingsCheck.rows[0].exists) {
        return res.status(400).json({
            success: false,
            error: 'Cannot delete room with active bookings'
        });
    }

    const result = await executeQuery(
        'DELETE FROM room WHERE room_id = $1 RETURNING *',
        [roomId]
    );

    if (!result.rows[0]) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }

    res.json({
        success: true,
        message: 'Room deleted successfully'
    });
});

/**
 * Get room types summary
 */
const getRoomTypesSummary = asyncHandler(async (req, res) => {
    const query = `
        SELECT 
            rt.room_type_id,
            rt.name as type_name,
            rt.capacity,
            rt.daily_rate,
            rt.amenities,
            COUNT(r.room_id) as total_rooms,
            COUNT(r.room_id) FILTER (WHERE r.status = 'Available') as available_rooms
        FROM room_type rt
        LEFT JOIN room r ON rt.room_type_id = r.room_type_id
        GROUP BY rt.room_type_id, rt.name, rt.capacity, rt.daily_rate, rt.amenities
        ORDER BY rt.daily_rate
    `;

    const result = await executeQuery(query);

    res.json({
        success: true,
        data: result.rows
    });
});

/**
 * Get room availability
 */
const getRoomAvailability = asyncHandler(async (req, res) => {
    const { start_date, end_date, branch_id, room_type_id } = req.query;
    
    let query = `
        SELECT 
            r.room_id,
            r.room_number,
            r.status,
            rt.name as room_type_name,
            b.branch_name
        FROM room r
        JOIN room_type rt ON r.room_type_id = rt.room_type_id
        JOIN branch b ON r.branch_id = b.branch_id
        WHERE r.status = 'Available'
        AND r.room_id NOT IN (
            SELECT room_id 
            FROM booking
            WHERE status NOT IN ('Cancelled', 'Checked-Out')
            AND (
                (check_in_date <= $1 AND check_out_date >= $2)
                OR (check_in_date <= $1 AND check_out_date >= $2)
                OR (check_in_date >= $1 AND check_out_date <= $2)
            )
        )
    `;

    const params = [end_date, start_date];
    let paramIndex = 2;

    if (branch_id) {
        query += ` AND r.branch_id = $${++paramIndex}`;
        params.push(branch_id);
    }

    if (room_type_id) {
        query += ` AND r.room_type_id = $${++paramIndex}`;
        params.push(room_type_id);
    }

    query += ` ORDER BY r.room_number`;

    const result = await executeQuery(query, params);

    res.json({
        success: true,
        data: result.rows
    });
});

/**
 * Update room status
 */
const updateRoomStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await executeQuery(
        'UPDATE room SET status = $1 WHERE room_id = $2 RETURNING *',
        [status, id]
    );

    if (!result.rows[0]) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }

    res.json({
        success: true,
        message: 'Room status updated successfully',
        data: result.rows[0]
    });
});

module.exports = {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomTypesSummary,
    getRoomAvailability,
    updateRoomStatus
};