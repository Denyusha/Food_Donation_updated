const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Update user location
router.post('/location', protect, async (req, res) => {
  try {
    const { location, accuracy, heading, speed, timestamp } = req.body;
    const userId = req.user.id;

    // Update user location in database
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location,
        lastLocationUpdate: timestamp || new Date(),
        locationAccuracy: accuracy,
        locationHeading: heading,
        locationSpeed: speed
      },
      { new: true }
    );

    // Emit location update via Socket.io if needed
    const io = req.app.get('io');
    if (io) {
      // Notify relevant users (e.g., if user is a volunteer on active delivery)
      io.to(`location-${userId}`).emit('location-update', {
        userId,
        location,
        accuracy,
        heading,
        speed,
        timestamp
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location'
    });
  }
});

// Get user location
router.get('/location/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('location lastLocationUpdate role name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      location: user.location,
      lastUpdate: user.lastLocationUpdate,
      user: {
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location'
    });
  }
});

// Get nearby users (for matching)
router.get('/nearby', protect, async (req, res) => {
  try {
    const { lat, lng, radius = 10, role } = req.query; // radius in km

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert to meters
        }
      }
    };

    if (role) {
      query.role = role;
    }

    const nearbyUsers = await User.find(query)
      .select('name role location phone organization')
      .limit(20);

    res.json({
      success: true,
      count: nearbyUsers.length,
      users: nearbyUsers
    });
  } catch (error) {
    console.error('Error finding nearby users:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding nearby users'
    });
  }
});

module.exports = router;