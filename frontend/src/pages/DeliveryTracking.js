import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Map3D from '../components/Map3D';
import OfflineMap from '../components/OfflineMap';
import locationService from '../services/locationService';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  FiMapPin, FiPackage, FiCheckCircle, FiWifi, FiWifiOff,
  FiTruck, FiClock, FiUser, FiNavigation
} from 'react-icons/fi';
import { format } from 'date-fns';
import localforage from 'localforage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create storage for offline tracking data
const trackingStorage = localforage.createInstance({
  name: 'food-donation',
  storeName: 'tracking-data'
});

export default function DeliveryTracking() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      toast.success('Back online - Syncing data');
      fetchTracking();
    };

    const handleOffline = () => {
      setOffline(true);
      toast('Offline mode - Using cached data', { icon: '📴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTracking = async () => {
    try {
      const res = await axios.get(`${API_URL}/donations/${id}/tracking`);
      if (res.data.success && res.data.tracking) {
        setTracking(res.data.tracking);

        // Cache for offline use
        await trackingStorage.setItem(`tracking_${id}`, {
          ...res.data.tracking,
          cachedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      // Try to load from cache
      const cached = await trackingStorage.getItem(`tracking_${id}`);
      if (cached) {
        setTracking(cached);
        toast('Using cached tracking data', { icon: '💾' });
      } else {
        toast.error('Failed to load tracking data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    // Initialize location tracking
    const initLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    initLocation();

    // Subscribe to location updates
    const unsubscribe = locationService.subscribe((location) => {
      setUserLocation(location);

      // If volunteer, update delivery location
      if (sharingLocation && tracking?.volunteerId === (user?.id || user?._id)) {
        updateVolunteerLocation(location);
      }
    });

    return () => {
      unsubscribe();
      if (sharingLocation) {
        locationService.stopTracking();
      }
    };
  }, [id]);

  const updateVolunteerLocation = async (location) => {
    try {
      await axios.post(`${API_URL}/donations/${id}/volunteer-location`, {
        lat: location.lat,
        lng: location.lng
      });

      // Update local state
      setTracking(prev => prev ? {
        ...prev,
        volunteerLocation: { ...location, updatedAt: new Date().toISOString() }
      } : null);
    } catch (error) {
      console.error('Error updating volunteer location:', error);
    }
  };

  const startSharingLocation = async () => {
    const userId = user?.id || user?._id;
    const result = await locationService.startTracking(userId, 'volunteer');
    if (result) {
      setSharingLocation(true);
      toast.success('📍 Sharing your location with donor & receiver');
    } else {
      toast.error('Failed to start location sharing');
    }
  };

  const stopSharingLocation = () => {
    locationService.stopTracking();
    setSharingLocation(false);
    toast.success('Stopped sharing location');
  };

  if (loading) return <LoadingSpinner />;

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
          >
            <FiPackage className="text-6xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Tracking Not Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Unable to load tracking information. Please try again later.
            </p>
            <Link
              to={`/donations/${id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all"
            >
              Back to Donation
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const { timeline, status, foodName, donorLocation, receiverLocation, volunteerLocation } = tracking;

  // Prepare route coordinates for 3D map
  const routeCoordinates = [];
  if (donorLocation) routeCoordinates.push([donorLocation.lng, donorLocation.lat]);
  if (volunteerLocation) routeCoordinates.push([volunteerLocation.lng, volunteerLocation.lat]);
  if (receiverLocation) routeCoordinates.push([receiverLocation.lng, receiverLocation.lat]);

  // Prepare donations for map display
  const mapDonations = [
    {
      _id: 'donor',
      foodName: 'Pickup Location',
      location: { coordinates: donorLocation ? [donorLocation.lng, donorLocation.lat] : null },
      status: 'donor',
      foodType: 'pickup'
    },
    {
      _id: 'receiver',
      foodName: 'Delivery Location',
      location: { coordinates: receiverLocation ? [receiverLocation.lng, receiverLocation.lat] : null },
      status: 'receiver',
      foodType: 'delivery'
    }
  ].filter(d => d.location.coordinates);

  const isVolunteer = user && tracking?.volunteerId && String(user.id || user._id) === String(tracking.volunteerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <FiTruck className="text-blue-500" />
                Live Delivery Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {foodName} • Status: <span className="font-semibold capitalize text-green-600">{status}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Online/Offline Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                offline ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {offline ? <FiWifiOff /> : <FiWifi />}
                <span className="text-sm font-medium">{offline ? 'Offline' : 'Online'}</span>
              </div>

              <Link
                to={`/donations/${id}`}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Back to Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3D Map */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
            >
              {offline ? (
                <OfflineMap
                  donations={mapDonations}
                  userLocation={volunteerLocation || userLocation}
                  showRoute={true}
                  routeCoordinates={routeCoordinates}
                  height="500px"
                  enableTracking={isVolunteer}
                  onMarkerClick={(donation) => {
                    if (donation._id === 'donor') {
                      toast('Pickup location: ' + (tracking.donorName || 'Donor'));
                    } else if (donation._id === 'receiver') {
                      toast('Delivery location: ' + (tracking.receiverName || 'Receiver'));
                    }
                  }}
                />
              ) : (
                <Map3D
                  donations={mapDonations}
                  userLocation={volunteerLocation || userLocation}
                  showRoute={true}
                  routeCoordinates={routeCoordinates}
                  height="500px"
                  enableTracking={isVolunteer}
                  enable3D={true}
                  onMarkerClick={(donation) => {
                    if (donation._id === 'donor') {
                      toast('Pickup location: ' + (tracking.donorName || 'Donor'));
                    } else if (donation._id === 'receiver') {
                      toast('Delivery location: ' + (tracking.receiverName || 'Receiver'));
                    }
                  }}
                />
              )}
            </motion.div>

            {/* Volunteer Controls */}
            {isVolunteer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
              >
                <h3 className="font-semibold text-lg mb-3 dark:text-white flex items-center gap-2">
                  <FiUser className="text-blue-500" />
                  Volunteer Controls
                </h3>
                <div className="flex flex-wrap gap-3">
                  {!sharingLocation ? (
                    <button
                      onClick={startSharingLocation}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <FiNavigation />
                      Share Live Location
                    </button>
                  ) : (
                    <button
                      onClick={stopSharingLocation}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      <FiNavigation className="animate-pulse" />
                      Stop Sharing
                    </button>
                  )}
                </div>
                {sharingLocation && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-3 text-center">
                    Your location is being shared in real-time
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
                <FiClock className="text-blue-500" />
                Delivery Timeline
              </h2>

              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600" />

                {timeline && timeline.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start mb-6 last:mb-0"
                  >
                    <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      step.done
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                    }`}>
                      {step.done ? (
                        <FiCheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="ml-12">
                      <p className={`font-semibold ${
                        step.done ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                      {step.description && (
                        <p className={`text-sm mt-1 ${
                          step.done 
                            ? 'text-gray-600 dark:text-gray-300' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                      )}
                      {step.at && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(step.at), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    Delivery Progress
                  </span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {Math.round((timeline.filter(s => s.done).length / timeline.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(timeline.filter(s => s.done).length / timeline.length) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6"
            >
              <h3 className="font-semibold mb-3 dark:text-white">Tracking Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Donation ID:</span>
                  <span className="font-medium dark:text-white">{id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className="font-medium capitalize text-green-600">{status}</span>
                </div>
                {tracking.volunteerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Volunteer:</span>
                    <span className="font-medium dark:text-white">{tracking.volunteerName}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Offline Notice */}
        {offline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              <FiWifiOff className="inline mr-2" />
              You're viewing cached data. The map and tracking information will update when you're back online.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}