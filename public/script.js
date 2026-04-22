// Global state
let currentUser = null;
let selectedEvent = null;

const API_BASE = 'http://localhost:3000/api';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    checkAuth();
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
});

// Check if user is logged in
function checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        showLoggedInUI();
    }
}

// Show/hide tabs
function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('register-form').style.display = 'none';
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
    }
}

// Register user
async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
        showMessage('Please fill all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            // Clear form
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-password').value = '';
            // Switch to login tab
            setTimeout(() => {
                showTab('login');
                document.querySelectorAll('.tab')[0].classList.add('active');
                document.querySelectorAll('.tab')[1].classList.remove('active');
            }, 1000);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please check your connection.', 'error');
    }
}

// Login user
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showMessage('Please fill all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data;
            localStorage.setItem('user', JSON.stringify(data));
            showLoggedInUI();
            showMessage('Welcome back, ' + data.username + '!', 'success');
            // Clear form
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please check your connection.', 'error');
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('user');
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('bookings-section').style.display = 'none';
}

// Show logged in UI
function showLoggedInUI() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('username').textContent = currentUser.username;
    document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('bookings-section').style.display = 'block';
    loadBookings();
}

// Load events
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events`);
        const events = await response.json();
        displayEvents(events);
    } catch (error) {
        console.error('Failed to load events:', error);
    }
}

// Display events
function displayEvents(events) {
    const container = document.getElementById('events-list');
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p class="loading">No upcoming events available</p>';
        return;
    }

    events.forEach(event => {
        const availableClass = event.available_tickets === 0 ? 'sold-out' : 
                              event.available_tickets < 20 ? 'low-stock' : 'available-tickets';
        
        const card = document.createElement('div');
        card.className = 'event-card';
        
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        card.innerHTML = `
            <div class="event-card-header">
                <h3>${event.name}</h3>
            </div>
            <div class="event-card-body">
                <div class="event-info">📅 <strong>${formattedDate}</strong></div>
                <div class="event-info">🕐 <strong>${formattedTime}</strong></div>
                <div class="event-info">📍 <strong>${event.venue}</strong></div>
                <div class="event-price">$${event.price}</div>
                <div class="${availableClass}">
                    ${event.available_tickets === 0 ? '❌ SOLD OUT' : `✅ ${event.available_tickets} tickets available out of ${event.total_tickets}`}
                </div>
                ${event.available_tickets > 0 && currentUser ? 
                    `<button onclick="openBookingModal(${event.event_id})" class="btn-primary book-btn">🎫 Book Now</button>` : 
                    event.available_tickets === 0 ? '<button class="btn-primary book-btn" disabled>Sold Out</button>' :
                    '<p style="color: var(--gray); text-align: center; margin-top: 1rem;">Please login to book tickets</p>'
                }
            </div>
        `;
        container.appendChild(card);
    });
}

// Open booking modal
function openBookingModal(eventId) {
    fetch(`${API_BASE}/events`)
        .then(res => res.json())
        .then(events => {
            selectedEvent = events.find(e => e.event_id === eventId);
            const eventDate = new Date(selectedEvent.event_date);
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            document.getElementById('event-details').innerHTML = `
                <h3>${selectedEvent.name}</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Venue:</strong> ${selectedEvent.venue}</p>
                <p><strong>Price:</strong> $${selectedEvent.price}</p>
            `;
            document.getElementById('booking-modal').style.display = 'block';
        });
}

// Close modal
function closeModal() {
    document.getElementById('booking-modal').style.display = 'none';
    document.getElementById('seat-number').value = '';
}

// Book ticket with concurrency handling
async function bookTicket() {
    if (!currentUser) {
        showMessage('Please login first', 'error');
        return;
    }

    const seatNumber = document.getElementById('seat-number').value.trim().toUpperCase();
    
    if (!seatNumber) {
        showMessage('Please enter a seat number', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: selectedEvent.event_id,
                userId: currentUser.userId,
                seatNumber: seatNumber
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(`✅ Ticket booked! Seat: ${seatNumber}, Price: $${data.price}`, 'success');
            closeModal();
            loadEvents();
            loadBookings();
        } else {
            // Handle concurrency errors
            if (response.status === 409) {
                showMessage(`⚠️ ${data.message}`, 'error');
            } else if (response.status === 400) {
                showMessage(`❌ ${data.message}`, 'error');
                loadEvents(); // Refresh to show updated availability
            } else {
                showMessage(data.message, 'error');
            }
        }
    } catch (error) {
        showMessage('Booking failed. Please try again.', 'error');
    }
}

// Load user bookings
async function loadBookings() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/bookings/${currentUser.userId}`);
        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

// Display bookings
function displayBookings(bookings) {
    const container = document.getElementById('bookings-list');
    container.innerHTML = '';

    if (bookings.length === 0) {
        container.innerHTML = '<p class="loading">No bookings yet. Start exploring events!</p>';
        return;
    }

    bookings.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        
        const eventDate = new Date(booking.event_date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const bookingTime = new Date(booking.booking_time);
        
        card.innerHTML = `
            <h3>${booking.event_name}</h3>
            <div class="booking-info">
                <div class="event-info">📅 <strong>${formattedDate}</strong></div>
                <div class="event-info">🕐 <strong>${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div class="event-info">📍 <strong>${booking.venue}</strong></div>
                <div class="event-info">💺 <strong>Seat: ${booking.seat_number}</strong></div>
                <div class="event-info">💰 <strong>$${booking.price}</strong></div>
                <div class="event-info">🎫 <strong>Booked: ${bookingTime.toLocaleDateString()}</strong></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Show message
function showMessage(message, type) {
    const existingMsg = document.querySelector('.message');
    if (existingMsg) existingMsg.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(msgDiv, document.querySelector('.container').firstChild.nextSibling);
    
    setTimeout(() => msgDiv.remove(), 5000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('booking-modal');
    if (event.target === modal) {
        closeModal();
    }
}
