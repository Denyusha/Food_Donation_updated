import localforage from 'localforage';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create storage for locations
const locationStorage = localforage.createInstance({
  name: 'food-donation',
  storeName: 'user-locations'
});

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastLocation = null;
    this.subscribers = new Set();
    this.updateInterval = null;
  }

  // Start tracking user location
  startTracking(userId, role) {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return Promise.resolve(this.lastLocation);
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date().toISOString()
          };

          this.lastLocation = location;
          this.isTracking = true;

          // Store location locally
          await this.storeLocation(userId, location);

          // Send to server if online
          if (navigator.onLine) {
            this.sendLocationToServer(userId, role, location);
          }

          toast.success('📍 Location tracking enabled');
          resolve(location);

          // Start continuous tracking
          this.startContinuousTracking(userId, role);
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          toast.error(errorMessage);
          // Resolve with null on error to avoid unhandled promise rejections
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Continuous location tracking
  startContinuousTracking(userId, role) {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date().toISOString()
        };

        // Only update if location has changed significantly (10 meters)
        if (this.hasLocationChanged(location)) {
          this.lastLocation = location;

          // Store location locally
          await this.storeLocation(userId, location);

          // Notify subscribers
          this.notifySubscribers(location);

          // Send to server if online
          if (navigator.onLine) {
            this.sendLocationToServer(userId, role, location);
          }
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        // Don't stop tracking on error, just log it
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        distanceFilter: 10 // Update every 10 meters
      }
    );

    // Also update location every 30 seconds even if not moving
    this.updateInterval = setInterval(() => {
      if (this.lastLocation && navigator.onLine) {
        this.sendLocationToServer(userId, role, this.lastLocation);
      }
    }, 30000);
  }

  // Check if location has changed significantly
  hasLocationChanged(newLocation) {
    if (!this.lastLocation) return true;

    const distance = this.calculateDistance(
      this.lastLocation.lat,
      this.lastLocation.lng,
      newLocation.lat,
      newLocation.lng
    );

    return distance > 0.01; // 10 meters
  }

  // Calculate distance between two points (in km)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Stop tracking location
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isTracking = false;
    toast.success('Location tracking disabled');
  }

  // Store location locally for offline access
  async storeLocation(userId, location) {
    try {
      const key = `location_${userId}`;
      const locationData = {
        ...location,
        userId,
        storedAt: new Date().toISOString()
      };

      await locationStorage.setItem(key, locationData);

      // Also store in location history
      const historyKey = `location_history_${userId}`;
      const history = (await locationStorage.getItem(historyKey)) || [];
      history.push(locationData);

      // Keep only last 100 locations in history
      if (history.length > 100) {
        history.shift();
      }

      await locationStorage.setItem(historyKey, history);
    } catch (error) {
      console.error('Error storing location:', error);
    }
  }

  // Get stored location
  async getStoredLocation(userId) {
    try {
      const key = `location_${userId}`;
      return await locationStorage.getItem(key);
    } catch (error) {
      console.error('Error getting stored location:', error);
      return null;
    }
  }

  // Get location history
  async getLocationHistory(userId) {
    try {
      const historyKey = `location_history_${userId}`;
      return (await locationStorage.getItem(historyKey)) || [];
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }

  // Send location to server
  async sendLocationToServer(userId, role, location) {
    try {
      await axios.post(`${API_URL}/users/location`, {
        userId,
        role,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        timestamp: location.timestamp
      });
    } catch (error) {
      console.error('Error sending location to server:', error);
      // Store for later sync if offline
      this.queueLocationUpdate(userId, role, location);
    }
  }

  // Queue location updates for offline sync
  async queueLocationUpdate(userId, role, location) {
    try {
      const queueKey = 'location_update_queue';
      const queue = (await locationStorage.getItem(queueKey)) || [];

      queue.push({
        userId,
        role,
        location,
        queuedAt: new Date().toISOString()
      });

      await locationStorage.setItem(queueKey, queue);
    } catch (error) {
      console.error('Error queuing location update:', error);
    }
  }

  // Sync queued location updates when back online
  async syncQueuedUpdates() {
    try {
      const queueKey = 'location_update_queue';
      const queue = (await locationStorage.getItem(queueKey)) || [];

      if (queue.length === 0) return;

      const successfulUpdates = [];

      for (const update of queue) {
        try {
          await this.sendLocationToServer(update.userId, update.role, update.location);
          successfulUpdates.push(update);
        } catch (error) {
          console.error('Failed to sync location update:', error);
        }
      }

      // Remove successful updates from queue
      const remainingQueue = queue.filter(update => !successfulUpdates.includes(update));
      await locationStorage.setItem(queueKey, remainingQueue);

      if (successfulUpdates.length > 0) {
        toast.success(`Synced ${successfulUpdates.length} location updates`);
      }
    } catch (error) {
      console.error('Error syncing location updates:', error);
    }
  }

  // Subscribe to location updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify all subscribers of location change
  notifySubscribers(location) {
    this.subscribers.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  // Get current location (one-time)
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          console.warn('getCurrentLocation error:', errorMessage);
          toast.error(errorMessage);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Check if location permission is granted
  async checkPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return 'unknown';
    }
  }

  // Request location permission
  async requestPermission() {
    try {
      const permission = await this.checkPermission();

      if (permission === 'granted') {
        return true;
      }

      if (permission === 'prompt') {
        // Trigger permission prompt by requesting location
        const loc = await this.getCurrentLocation();
        return !!loc;
      }

      if (permission === 'denied') {
        toast.error('Location permission denied. Please enable it in your browser settings.');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }
}

// Create singleton instance
const locationService = new LocationService();

// Listen for online/offline events
window.addEventListener('online', () => {
  locationService.syncQueuedUpdates();
});

export default locationService;