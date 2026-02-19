import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiMapPin, FiUsers, FiTruck, FiHeart,
  FiChevronRight, FiActivity, FiGlobe,
  FiShield, FiClock
} from 'react-icons/fi';
import Map3D from '../components/Map3D';
import OfflineMap from '../components/OfflineMap';
import locationService from '../services/locationService';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeDonors: 0,
    mealsServed: 0,
    co2Reduced: 0
  });

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Request location permission and start tracking
    const initLocation = async () => {
      try {
        const hasPermission = await locationService.requestPermission();
        if (hasPermission) {
          const location = await locationService.getCurrentLocation();
          setUserLocation(location);

          if (user) {
            locationService.startTracking(user.id || user._id, user.role);
          }

          // Fetch nearby donations
          fetchNearbyDonations(location);
        }
      } catch (error) {
        console.error('Location error:', error);
      }
    };

    initLocation();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };

    // Subscribe to location updates
    const unsubscribe = locationService.subscribe((location) => {
      setUserLocation(location);
    });

    // Fetch stats
    fetchStats();

    return () => {
      unsubscribe();
      if (user) {
        locationService.stopTracking();
      }
    };
  }, [user]);

  const fetchNearbyDonations = async (location) => {
    try {
      const response = await axios.get(`${API_URL}/donations`, {
        params: {
          lat: location.lat,
          lng: location.lng,
          status: 'pending',
          limit: 5
        }
      });

      if (response.data.success) {
        setNearbyDonations(response.data.donations);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // In a real app, this would be an API call
      setStats({
        totalDonations: 15234,
        activeDonors: 523,
        mealsServed: 48392,
        co2Reduced: 5.2
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleQuickAction = (action) => {
    if (!user) {
      toast('Please login to continue');
      navigate('/login');
      return;
    }

    switch (action) {
      case 'donate':
        navigate('/create-donation');
        break;
      case 'find':
        navigate('/donations');
        break;
      case 'volunteer':
        navigate('/volunteer/dashboard');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section with 3D Map Background */}
      <section className="relative h-screen overflow-hidden">
        {/* 3D Map Background */}
        <div className="absolute inset-0 z-0">
          {isOffline ? (
            <OfflineMap
              donations={nearbyDonations}
              userLocation={userLocation}
              height="100%"
              enableTracking={true}
            />
          ) : (
            <Map3D
              donations={nearbyDonations}
              userLocation={userLocation}
              height="100%"
              enableTracking={true}
              enable3D={true}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-white px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Share Food, Share Love
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Connect surplus food with those in need through real-time 3D tracking
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction('donate')}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all"
              >
                <FiHeart className="inline mr-2" />
                Donate Food
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction('find')}
                className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-full font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                <FiMapPin className="inline mr-2" />
                Find Donations
              </motion.button>

              {!user && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/register')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all"
                >
                  Get Started
                  <FiChevronRight className="inline ml-2" />
                </motion.button>
              )}
            </div>

            {/* Location Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">
                {userLocation ? `Tracking location • ${nearbyDonations.length} donations nearby` : 'Enable location for better experience'}
              </span>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-8"
          >
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 dark:text-white">Real-Time Impact</h2>
            <p className="text-gray-600 dark:text-gray-400">Making a difference, one meal at a time</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: FiActivity, value: stats.totalDonations.toLocaleString(), label: 'Total Donations', color: 'from-blue-500 to-indigo-600' },
              { icon: FiUsers, value: stats.activeDonors.toLocaleString(), label: 'Active Donors', color: 'from-green-500 to-emerald-600' },
              { icon: FiHeart, value: `${stats.mealsServed.toLocaleString()}+`, label: 'Meals Served', color: 'from-red-500 to-pink-600' },
              { icon: FiGlobe, value: `${stats.co2Reduced}T`, label: 'CO₂ Reduced', color: 'from-purple-500 to-indigo-600' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl"
                  style={{ background: `linear-gradient(to right, ${stat.color.split(' ')[1]}, ${stat.color.split(' ')[3]})` }}
                />
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white mb-4`}>
                    <stat.icon size={24} />
                  </div>
                  <div className="text-3xl font-bold mb-2 dark:text-white">{stat.value}</div>
                  <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 dark:text-white">Why Choose Our Platform?</h2>
            <p className="text-gray-600 dark:text-gray-400">Advanced features for seamless food donation</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FiMapPin,
                title: '3D Map Tracking',
                description: 'Real-time 3D visualization of donations and delivery routes with offline support',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: FiTruck,
                title: 'Smart Matching',
                description: 'AI-powered algorithm matches donors with nearby receivers instantly',
                gradient: 'from-green-500 to-emerald-500'
              },
              {
                icon: FiShield,
                title: 'Verified Network',
                description: 'All participants are verified to ensure safe and reliable food sharing',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: FiClock,
                title: 'Real-Time Updates',
                description: 'Get instant notifications about donation status and delivery progress',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                icon: FiUsers,
                title: 'Community Driven',
                description: 'Join thousands of volunteers making a difference in their communities',
                gradient: 'from-indigo-500 to-purple-500'
              },
              {
                icon: FiActivity,
                title: 'Impact Analytics',
                description: 'Track your contribution with detailed analytics and environmental impact',
                gradient: 'from-pink-500 to-rose-500'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl`} />
                <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6`}>
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 dark:text-white">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 px-4 bg-gradient-to-r from-green-500 to-emerald-600">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center text-white"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join our community and help reduce food waste while feeding those in need
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="px-10 py-4 bg-white text-green-600 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-all"
            >
              Start Your Journey
              <FiChevronRight className="inline ml-2" />
            </motion.button>
          </motion.div>
        </section>
      )}
    </div>
  );
};

export default Home;