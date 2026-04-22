-- Event Ticketing System Database
-- DBMS Mini Project with Peak-Hour Concurrency Handling

CREATE DATABASE IF NOT EXISTS event_ticketing;
USE event_ticketing;

-- Drop existing tables and procedures (for clean re-installation)
DROP PROCEDURE IF EXISTS book_ticket;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    event_date DATETIME NOT NULL,
    venue VARCHAR(100) NOT NULL,
    total_tickets INT NOT NULL,
    available_tickets INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CHECK (available_tickets >= 0),
    CHECK (available_tickets <= total_tickets)
);

-- Bookings Table
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_seat (event_id, seat_number)
);

-- Index for better query performance during concurrent access
CREATE INDEX idx_event_available ON events(available_tickets);
CREATE INDEX idx_booking_user ON bookings(user_id);
CREATE INDEX idx_booking_event ON bookings(event_id);

-- Stored Procedure for Ticket Booking with Concurrency Control
DELIMITER //
CREATE PROCEDURE book_ticket(
    IN p_event_id INT,
    IN p_user_id INT,
    IN p_seat_number VARCHAR(10),
    IN p_price DECIMAL(10,2),
    OUT p_result VARCHAR(100)
)
BEGIN
    DECLARE v_available INT;
    DECLARE v_exit_handler INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Booking failed due to database error';
    END;
    
    START TRANSACTION;
    
    -- Row-level locking to prevent race conditions
    SELECT available_tickets INTO v_available
    FROM events
    WHERE event_id = p_event_id
    FOR UPDATE;
    
    IF v_available IS NULL THEN
        SET p_result = 'ERROR: Event not found';
        ROLLBACK;
    ELSEIF v_available <= 0 THEN
        SET p_result = 'ERROR: Tickets sold out';
        ROLLBACK;
    ELSE
        -- Insert booking
        INSERT INTO bookings (event_id, user_id, seat_number, status)
        VALUES (p_event_id, p_user_id, p_seat_number, 'confirmed');
        
        -- Update available tickets
        UPDATE events
        SET available_tickets = available_tickets - 1
        WHERE event_id = p_event_id;
        
        COMMIT;
        SET p_result = 'SUCCESS: Ticket booked successfully';
    END IF;
END //
DELIMITER ;

-- Sample Data

-- Users (password for all users: "password123")
-- The bcrypt hash below is for "password123"
INSERT INTO users (username, email, password) VALUES
('john_doe', 'john@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('jane_smith', 'jane@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('alice_wonder', 'alice@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
('bob_builder', 'bob@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

-- Events (mix of different types and dates)
INSERT INTO events (name, event_date, venue, total_tickets, available_tickets, price) VALUES
('Rock Concert - Live Band', '2026-05-15 19:00:00', 'City Arena', 100, 100, 50.00),
('Tech Conference 2026', '2026-06-20 09:00:00', 'Convention Center', 200, 200, 100.00),
('Stand-up Comedy Night', '2026-07-10 20:00:00', 'Laugh Club Downtown', 50, 50, 30.00),
('Food & Music Festival', '2026-08-05 11:00:00', 'Central Park', 500, 500, 25.00),
('DJ Night - Electronic Dance', '2026-05-25 21:00:00', 'Club Paradise', 150, 150, 40.00),
('Jazz Evening', '2026-06-15 18:30:00', 'Blue Note Theater', 80, 80, 60.00),
('Startup Pitch Competition', '2026-07-01 10:00:00', 'Innovation Hub', 120, 120, 15.00),
('Classical Music Concert', '2026-08-20 19:00:00', 'Symphony Hall', 250, 250, 75.00),
('Art Exhibition Opening', '2026-06-10 17:00:00', 'Modern Art Gallery', 100, 100, 20.00),
('Sports Meet - Marathon', '2026-09-05 06:00:00', 'City Stadium', 1000, 1000, 35.00);

-- Sample Bookings (to show some events already have bookings)
INSERT INTO bookings (event_id, user_id, seat_number, status, booking_time) VALUES
(1, 1, 'A1', 'confirmed', '2026-04-20 10:30:00'),
(1, 1, 'A2', 'confirmed', '2026-04-20 10:31:00'),
(1, 2, 'B1', 'confirmed', '2026-04-20 11:00:00'),
(2, 2, 'VIP1', 'confirmed', '2026-04-21 09:15:00'),
(2, 3, 'VIP2', 'confirmed', '2026-04-21 09:20:00'),
(3, 1, 'C5', 'confirmed', '2026-04-22 14:00:00'),
(4, 4, 'F10', 'confirmed', '2026-04-22 15:30:00');

-- Update available_tickets to reflect the bookings above
UPDATE events SET available_tickets = 97 WHERE event_id = 1;  -- 3 bookings
UPDATE events SET available_tickets = 198 WHERE event_id = 2; -- 2 bookings
UPDATE events SET available_tickets = 49 WHERE event_id = 3;  -- 1 booking
UPDATE events SET available_tickets = 499 WHERE event_id = 4; -- 1 booking

-- Note: All user passwords are "password123"
-- To create users with different passwords, use bcrypt to generate new hashes
