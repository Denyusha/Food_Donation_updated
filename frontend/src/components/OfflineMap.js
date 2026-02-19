import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import localforage from 'localforage';
import { FiWifi, FiWifiOff, FiNavigation, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Initialize offline storage for map tiles
const tileStorage = localforage.createInstance({
  name: 'food-donation-maps',
  storeName: 'offline-tiles'
});

const OfflineMap = ({
  donations = [],
  userLocation = null,
  onMarkerClick = () => {},
  showRoute = false,
  routeCoordinates = [],
  height = '600px',
  enableTracking = true
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [mapLoaded, setMapLoaded] = useState(false);
  const watchId = useRef(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Back online - Map syncing');
      if (map.current) {
        map.current.invalidateSize();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast('Offline mode - Using cached map data', { icon: '📴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Custom tile layer with offline support
  const createOfflineTileLayer = useCallback(() => {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0,
      // Cache tiles for offline use
      crossOrigin: true
    });
  }, []);

  // Cache tile for offline use
  const cacheTile = useCallback(async (tileUrl, tileData) => {
    if (!isOffline && navigator.onLine) {
      try {
        const response = await fetch(tileUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        await tileStorage.setItem(tileUrl, arrayBuffer);
      } catch (error) {
        console.error('Error caching tile:', error);
      }
    }
  }, [isOffline]);

  // Get tile from cache or fetch
  const getTile = useCallback(async (tileUrl) => {
    try {
      // Try cache first
      const cached = await tileStorage.getItem(tileUrl);
      if (cached) {
        return URL.createObjectURL(new Blob([cached]));
      }
      
      // If online, fetch and cache
      if (navigator.onLine) {
        const response = await fetch(tileUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        await tileStorage.setItem(tileUrl, arrayBuffer);
        return URL.createObjectURL(blob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting tile:', error);
      return null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const center = userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [12.9716, 77.5946]; // Default to Bangalore

    map.current = L.map(mapContainer.current, {
      center,
      zoom: 12,
      zoomControl: true
    });

    // Add tile layer
    const tileLayer = createOfflineTileLayer();
    tileLayer.addTo(map.current);

    // Cache tiles as they load
    tileLayer.on('tileload', (e) => {
      cacheTile(e.tile.src, e.tile);
    });

    // Handle tile errors - try to load from cache
    tileLayer.on('tileerror', async (e) => {
      if (isOffline) {
        const cachedUrl = await getTile(e.tile.src);
        if (cachedUrl) {
          e.tile.src = cachedUrl;
        }
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Store last location for offline use
    if (userLocation) {
      localforage.setItem('last-map-center', {
        lat: userLocation.lat,
        lng: userLocation.lng,
        timestamp: Date.now()
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (map.current && userLocation) {
      map.current.setView([userLocation.lat, userLocation.lng], map.current.getZoom());
    }
  }, [userLocation]);

  // Add donation markers
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => {
      map.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add donation markers
    donations.forEach(donation => {
      if (donation.location?.coordinates) {
        const [lng, lat] = donation.location.coordinates;
        
        // Create custom icon based on status
        const iconColor = {
          pending: '#fbbf24',
          accepted: '#10b981',
          picked: '#3b82f6',
          completed: '#6b7280',
          cancelled: '#ef4444'
        }[donation.status] || '#6b7280';

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background: white;
              border: 3px solid ${iconColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">
              ${donation.foodType === 'vegetarian' ? '🥗' : donation.foodType === 'non-vegetarian' ? '🍖' : '🍽️'}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map.current)
          .bindPopup(`
            <div style="padding: 10px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${donation.foodName}</h3>
              <p style="margin: 4px 0;">Quantity: ${donation.quantity} ${donation.unit || 'servings'}</p>
              <p style="margin: 4px 0;">Status: <span style="text-transform: capitalize;">${donation.status}</span></p>
              ${donation.distance ? `<p style="margin: 4px 0;">Distance: ${donation.distance.toFixed(1)} km</p>` : ''}
            </div>
          `);

        marker.on('click', () => onMarkerClick(donation));
        markersRef.current.push(marker);
      }
    });
  }, [donations, mapLoaded, onMarkerClick]);

  // Draw route if needed
  useEffect(() => {
    if (!mapLoaded || !map.current || !showRoute || routeCoordinates.length === 0) return;

    // Remove existing route
    if (routeLayerRef.current) {
      map.current.removeLayer(routeLayerRef.current);
    }

    // Convert route coordinates to LatLng array
    const latLngs = routeCoordinates.map(coord => [coord[1], coord[0]]);

    // Add route polyline
    routeLayerRef.current = L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7
    }).addTo(map.current);

    // Fit map to show entire route
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [showRoute, routeCoordinates, mapLoaded]);

  // Track user location
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        // Update or create user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const userIcon = L.divIcon({
            className: 'user-marker',
            html: `
              <div style="
                width: 30px;
                height: 30px;
                font-size: 24px;
              ">
                📍
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(map.current);
        }

        // Center map on user
        map.current.setView([latitude, longitude], 15);

        // Store location for offline use
        localforage.setItem('last-user-location', {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now()
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (userMarkerRef.current) {
      map.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, []);

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-2xl" style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" style={{ height }} />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 space-y-2">
        {/* Online/Offline Indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded ${
          isOffline 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' 
            : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {isOffline ? <FiWifiOff /> : <FiWifi />}
          <span className="text-sm font-medium">{isOffline ? 'Offline' : 'Online'}</span>
        </div>

        {/* Location Tracking */}
        {enableTracking && (
          <button
            onClick={watchId.current ? stopTracking : startTracking}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors w-full ${
              watchId.current 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
          >
            <FiNavigation className={watchId.current ? 'animate-pulse' : ''} />
            <span className="text-sm font-medium">{watchId.current ? 'Stop' : 'Track'}</span>
          </button>
        )}
      </div>

      {/* Map Styles */}
      <style jsx>{`
        .custom-marker {
          cursor: pointer;
        }
        .user-marker {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default OfflineMap;
