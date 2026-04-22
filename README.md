# Event Ticketing & Entry Database System

A simple DBMS mini project demonstrating **peak-hour concurrency handling** in a ticket booking system using MySQL, Node.js, and vanilla HTML/CSS/JS.

## Features

✅ Event listing with real-time ticket availability  
✅ User registration and login  
✅ Ticket booking with concurrency control  
✅ View booked tickets  
✅ Prevents double-booking during peak hours  

## Technology Stack

- **Database:** MySQL (with transactions & row-level locking)
- **Backend:** Node.js + Express
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Authentication:** bcrypt for password hashing

## Concurrency Handling

This project implements **database-level concurrency control** to handle multiple users booking tickets simultaneously:

1. **Row-Level Locking** (`SELECT ... FOR UPDATE`): Locks event row during booking to prevent race conditions
2. **ACID Transactions**: Ensures booking operations are atomic
3. **Unique Constraints**: Prevents duplicate seat bookings
4. **Connection Pooling**: Handles concurrent database connections efficiently
5. **Error Handling**: Gracefully manages booking conflicts

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm (comes with Node.js)

## Installation & Setup

### Step 1: Setup MySQL Database

1. Start your MySQL server
2. Run the database script:
```bash
mysql -u root -p < database.sql
```

Or manually execute the SQL commands in `database.sql` in MySQL Workbench/phpMyAdmin.

### Step 2: Install Backend Dependencies

```bash
npm install
```

### Step 3: Configure Database Connection

Open `server.js` and update the MySQL connection settings (line 12-17):

```javascript
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'YOUR_PASSWORD',  // Change this
    database: 'event_ticketing',
    // ...
});
```

### Step 4: Start the Server

```bash
npm start
```

The application will run on: **http://localhost:3000**

## Project Structure

```
event-ticketing-mini/
├── database.sql          # MySQL schema, procedures, sample data
├── server.js             # Node.js backend (all API endpoints)
├── package.json          # Node.js dependencies
├── public/
│   ├── index.html        # Frontend HTML
│   ├── style.css         # CSS styling
│   └── script.js         # Frontend JavaScript
└── README.md             # This file
```

## Database Schema

### Tables

**1. users**
- user_id, username, email, password, created_at

**2. events**
- event_id, name, event_date, venue, total_tickets, available_tickets, price

**3. bookings**
- booking_id, event_id, user_id, seat_number, status, booking_time

### Key Constraints

- **Foreign Keys**: bookings → events, bookings → users
- **Unique Constraint**: (event_id, seat_number) prevents double-booking
- **Check Constraints**: available_tickets >= 0

### Stored Procedure

`book_ticket()` - Handles ticket booking with transaction and row-level locking

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events | Get all upcoming events |
| POST | /api/register | Register new user |
| POST | /api/login | Login user |
| POST | /api/book | Book a ticket |
| GET | /api/bookings/:userId | Get user's bookings |

## How Concurrency Works

### Booking Flow (Prevents Race Conditions)

```javascript
1. BEGIN TRANSACTION
2. SELECT available_tickets FROM events WHERE event_id = X FOR UPDATE
   → This locks the row, other bookings must wait
3. Check if tickets available
4. INSERT INTO bookings (user's booking)
5. UPDATE events SET available_tickets = available_tickets - 1
6. COMMIT TRANSACTION
   → Row lock released, next booking proceeds
```

### What Happens During Peak Hours?

When multiple users try to book the same event simultaneously:
- **First request** gets the row lock and completes the booking
- **Other requests** wait until the lock is released
- Each request then checks the updated available_tickets count
- If sold out, subsequent bookings are rejected safely

## Usage

1. Open http://localhost:3000 in your browser
2. Register a new account or login
3. Browse available events
4. Click "Book Now" on an event
5. Enter a seat number (e.g., A1, B5, C10)
6. View your bookings in "My Bookings" section

## Testing Concurrency

To test peak-hour concurrency:

1. Open the app in **multiple browser windows/tabs**
2. Login with different accounts
3. Try booking the **same event** at the **same time**
4. Observe how the system prevents overselling

## DBMS Concepts Demonstrated

✓ **ACID Properties** - Atomicity through transactions  
✓ **Concurrency Control** - Row-level locking (SELECT FOR UPDATE)  
✓ **Normalization** - 3NF database design  
✓ **Integrity Constraints** - Foreign keys, unique constraints  
✓ **Stored Procedures** - Business logic in database layer  
✓ **Indexing** - Performance optimization for concurrent queries  
✓ **Connection Pooling** - Efficient resource management  

## Sample Data

The database includes 4 sample events:
- Rock Concert (100 tickets - $50)
- Tech Conference (200 tickets - $100)
- Comedy Show (50 tickets - $30)
- Food Festival (500 tickets - $25)

## Troubleshooting

**Cannot connect to MySQL?**
- Check if MySQL server is running
- Verify username/password in `server.js`
- Ensure database `event_ticketing` exists

**Port 3000 already in use?**
- Change the port in `server.js` (last line)
- Or stop the application using port 3000

**Registration/Login not working?**
- Check browser console for errors
- Verify API is running (http://localhost:3000/api/events should return events)

## License

This is a mini project for educational purposes.

---

**Developed for DBMS Mini Project** | Demonstrates Peak-Hour Concurrency Handling
