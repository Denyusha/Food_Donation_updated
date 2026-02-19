import React from 'react';
import OfflineMap from './OfflineMap';

// Leaflet-based replacement for the old Mapbox 3D map.
// We keep the same props interface so existing usages keep working.
const Map3D = (props) => {
  return <OfflineMap {...props} />;
};

export default Map3D;