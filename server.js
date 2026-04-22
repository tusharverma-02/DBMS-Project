const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool for handling concurrent requests
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'HOney@6599', // Change to your MySQL password
    database: 'event_ticketing',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// GET /api/events - List all events
app.get('/api/events', async (req, res) => {
    try {
        const [events] = await pool.query(
            'SELECT * FROM events WHERE event_date > NOW() ORDER BY event_date ASC'
        );
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// POST /api/register - Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT user_id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        
        res.json({ 
            success: true, 
            message: 'Registration successful',
            userId: result.insertId,
            username: username
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// POST /api/login - Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.json({
            success: true,
            userId: user.user_id,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// POST /api/book - Book ticket with concurrency control
app.post('/api/book', async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
        const { eventId, userId, seatNumber } = req.body;
        
        await conn.beginTransaction();
        
        // Row-level locking to prevent race conditions during peak hours
        const [events] = await conn.query(
            'SELECT available_tickets, price FROM events WHERE event_id = ? FOR UPDATE',
            [eventId]
        );
        
        if (events.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        const event = events[0];
        
        if (event.available_tickets <= 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Tickets sold out' });
        }
        
        // Insert booking
        const [result] = await conn.query(
            'INSERT INTO bookings (event_id, user_id, seat_number, status) VALUES (?, ?, ?, "confirmed")',
            [eventId, userId, seatNumber]
        );
        
        // Update available tickets
        await conn.query(
            'UPDATE events SET available_tickets = available_tickets - 1 WHERE event_id = ?',
            [eventId]
        );
        
        await conn.commit();
        
        res.json({
            success: true,
            message: 'Ticket booked successfully',
            bookingId: result.insertId,
            seatNumber: seatNumber,
            price: event.price
        });
        
    } catch (error) {
        await conn.rollback();
        
        // Handle unique constraint violation (double booking)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false, 
                message: 'This seat was just booked by someone else. Please select another seat.' 
            });
        }
        
        res.status(500).json({ success: false, message: 'Booking failed' });
    } finally {
        conn.release();
    }
});

// GET /api/bookings/:userId - Get user's bookings
app.get('/api/bookings/:userId', async (req, res) => {
    try {
        const [bookings] = await pool.query(
            `SELECT b.*, e.name as event_name, e.event_date, e.venue, e.price
             FROM bookings b
             JOIN events e ON b.event_id = e.event_id
             WHERE b.user_id = ? AND b.status = 'confirmed'
             ORDER BY b.booking_time DESC`,
            [req.params.userId]
        );
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Event Ticketing System started!');
});
