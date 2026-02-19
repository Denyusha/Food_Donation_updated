const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data storage for development (when MongoDB is not available)
const inMemoryDB = {
  users: [
    {
      _id: '1',
      id: '1',
      name: 'John Donor',
      email: 'donor@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGU5jE4QqJe', // password: password123
      role: 'donor',
      phone: '1234567890',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      points: 100,
      badges: ['first_donation'],
      isVerified: true,
      createdAt: new Date()
    },
    {
      _id: '2',
      id: '2',
      name: 'Jane Receiver',
      email: 'receiver@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGU5jE4QqJe', // password: password123
      role: 'receiver',
      phone: '0987654321',
      organization: 'Food Bank NGO',
      location: { type: 'Point', coordinates: [77.6066, 12.9784] },
      points: 50,
      badges: [],
      isVerified: true,
      createdAt: new Date()
    },
    {
      _id: '3',
      id: '3',
      name: 'Mike Volunteer',
      email: 'volunteer@test.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGU5jE4QqJe', // password: password123
      role: 'volunteer',
      phone: '1122334455',
      location: { type: 'Point', coordinates: [77.5900, 12.9700] },
      points: 200,
      badges: ['super_volunteer'],
      isVerified: true,
      createdAt: new Date()
    }
  ],
  donations: [
    {
      _id: '101',
      id: '101',
      donorId: '1',
      foodName: 'Fresh Vegetables',
      foodType: 'veg',
      quantity: 10,
      unit: 'kg',
      description: 'Assorted fresh vegetables from local farm',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      address: '123 MG Road, Bangalore',
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'pending',
      freshness: 95,
      healthScore: 9,
      images: [],
      createdAt: new Date()
    },
    {
      _id: '102',
      id: '102',
      donorId: '1',
      foodName: 'Cooked Rice and Curry',
      foodType: 'veg',
      quantity: 20,
      unit: 'servings',
      description: 'Freshly cooked rice with vegetable curry',
      location: { type: 'Point', coordinates: [77.6066, 12.9784] },
      address: '456 Brigade Road, Bangalore',
      expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
      status: 'pending',
      freshness: 90,
      healthScore: 8,
      images: [],
      createdAt: new Date()
    }
  ],
  notifications: []
};

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);
app.set('db', inMemoryDB);

// Basic Auth Routes (Simplified for testing)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = inMemoryDB.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // For testing, accept 'password123' for all test users
  if (password !== 'password123') {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Generate a simple token for testing
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      location: user.location,
      points: user.points,
      badges: user.badges
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if user exists
  if (inMemoryDB.users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }

  const newUser = {
    _id: String(inMemoryDB.users.length + 1),
    id: String(inMemoryDB.users.length + 1),
    name,
    email,
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGU5jE4QqJe',
    role,
    phone,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    points: 0,
    badges: [],
    isVerified: false,
    createdAt: new Date()
  };

  inMemoryDB.users.push(newUser);

  const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

  res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// Donations Routes
app.get('/api/donations', (req, res) => {
  const { status, lat, lng, limit = 10 } = req.query;

  let donations = [...inMemoryDB.donations];

  // Filter by status
  if (status) {
    donations = donations.filter(d => d.status === status);
  }

  // Add distance calculation if location provided
  if (lat && lng) {
    donations = donations.map(donation => {
      // Simple distance calculation (in km)
      const distance = Math.sqrt(
        Math.pow(donation.location.coordinates[0] - parseFloat(lng), 2) +
        Math.pow(donation.location.coordinates[1] - parseFloat(lat), 2)
      ) * 111; // Approximate conversion to km

      return { ...donation, distance };
    }).sort((a, b) => a.distance - b.distance);
  }

  // Get donor information
  donations = donations.map(donation => {
    const donor = inMemoryDB.users.find(u => u.id === donation.donorId);
    return {
      ...donation,
      donorName: donor?.name,
      donorPhone: donor?.phone
    };
  });

  res.json({
    success: true,
    donations: donations.slice(0, parseInt(limit))
  });
});

app.get('/api/donations/:id', (req, res) => {
  const donation = inMemoryDB.donations.find(d => d._id === req.params.id);

  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }

  const donor = inMemoryDB.users.find(u => u.id === donation.donorId);

  res.json({
    success: true,
    donation: {
      ...donation,
      donorName: donor?.name,
      donorPhone: donor?.phone
    }
  });
});

app.post('/api/donations', (req, res) => {
  const newDonation = {
    _id: String(Date.now()),
    id: String(Date.now()),
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  };

  inMemoryDB.donations.push(newDonation);

  res.status(201).json({
    success: true,
    donation: newDonation
  });
});

app.get('/api/donations/:id/tracking', (req, res) => {
  const donation = inMemoryDB.donations.find(d => d._id === req.params.id);

  if (!donation) {
    return res.status(404).json({ success: false, message: 'Donation not found' });
  }

  const tracking = {
    foodName: donation.foodName,
    status: donation.status,
    donorLocation: { lat: donation.location.coordinates[1], lng: donation.location.coordinates[0] },
    receiverLocation: { lat: 12.9784, lng: 77.6066 },
    volunteerLocation: donation.status === 'picked' ? { lat: 12.9750, lng: 77.6000 } : null,
    timeline: [
      { step: 1, label: 'Donation Created', done: true, at: donation.createdAt },
      { step: 2, label: 'Accepted by Receiver', done: donation.status !== 'pending', at: donation.status !== 'pending' ? new Date() : null },
      { step: 3, label: 'Volunteer Assigned', done: donation.status === 'picked' || donation.status === 'completed', at: null },
      { step: 4, label: 'Picked Up', done: donation.status === 'picked' || donation.status === 'completed', at: null },
      { step: 5, label: 'Delivered', done: donation.status === 'completed', at: null }
    ]
  };

  res.json({
    success: true,
    tracking
  });
});

// User location update
app.post('/api/users/location', (req, res) => {
  // Simple response for location updates
  res.json({
    success: true,
    message: 'Location updated successfully',
    location: req.body.location
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Food Donation API (Development Mode) is running',
    mode: 'In-Memory Database',
    note: 'Using mock data for testing without MongoDB'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Food Donation Backend (Dev Mode)         ║
║   Running on port ${PORT}                        ║
║   Using In-Memory Database                    ║
║                                                ║
║   Test Credentials:                           ║
║   - donor@test.com / password123              ║
║   - receiver@test.com / password123           ║
║   - volunteer@test.com / password123          ║
║                                                ║
║   Frontend: http://localhost:3000             ║
║   Backend:  http://localhost:${PORT}             ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});