const User = require('../models/User');
const sendNotification = require('./sendNotification');

/**
 * Notify all active volunteers about a new donation that needs pickup
 * @param {Object} io - Socket.io instance
 * @param {Object} donation - Donation object
 * @returns {Promise<Array>} Array of notification results
 */
const notifyAllVolunteers = async (io, donation) => {
  try {
    // Get all active volunteers
    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true
    }).select('_id name location');

    if (!volunteers || volunteers.length === 0) {
      console.log('No active volunteers found');
      return [];
    }

    // Send notification to each volunteer
    const notificationPromises = volunteers.map(volunteer =>
      sendNotification(
        io,
        volunteer._id,
        'donation_available',
        'New Donation Needs Pickup',
        `A donation "${donation.foodName}" has been accepted and needs pickup. Click to view details.`,
        {
          donationId: donation._id,
          donorId: donation.donorId,
          receiverId: donation.receiverId,
          location: donation.location,
          foodName: donation.foodName,
          quantity: donation.quantity,
          unit: donation.unit
        }
      )
    );

    const results = await Promise.allSettled(notificationPromises);
    console.log(`Notified ${volunteers.length} volunteers about donation ${donation._id}`);
    
    return results;
  } catch (error) {
    console.error('Error notifying volunteers:', error);
    return [];
  }
};

module.exports = notifyAllVolunteers;
