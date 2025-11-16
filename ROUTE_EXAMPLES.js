// Example: Using the Route Service in React Components

import React, { useState } from 'react';
import { getRouteCoordinates, calculateBounds, calculateCenter } from '../services/routeService';
import { message } from 'antd';

export const RouteExample = () => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Example 1: Basic Route Calculation
  const handleBasicRoute = async () => {
    setLoading(true);
    try {
      const coordinates = await getRouteCoordinates(
        27.7136,    // origin latitude (TAMUCC Campus Center)
        -97.3252,   // origin longitude
        27.7200,    // destination latitude
        -97.3100    // destination longitude
      );

      setRouteData({
        coordinates,
        length: coordinates.length
      });

      message.success('Route fetched successfully!');
    } catch (error) {
      message.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Route with Bounds Calculation
  const handleRouteWithBounds = async () => {
    setLoading(true);
    try {
      const coordinates = await getRouteCoordinates(
        27.7136, -97.3252,
        27.7200, -97.3100
      );

      const bounds = calculateBounds(coordinates);
      const center = calculateCenter(coordinates);

      setRouteData({
        coordinates,
        bounds,
        center,
        info: `Route spans from (${bounds.south.toFixed(4)}, ${bounds.west.toFixed(4)}) to (${bounds.north.toFixed(4)}, ${bounds.east.toFixed(4)})`
      });

      message.success('Route and bounds calculated!');
    } catch (error) {
      message.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Multiple Routes
  const handleMultipleRoutes = async () => {
    setLoading(true);
    try {
      const routes = await Promise.all([
        getRouteCoordinates(27.7136, -97.3252, 27.7200, -97.3100),
        getRouteCoordinates(27.7150, -97.3200, 27.7250, -97.3150)
      ]);

      setRouteData({
        routes,
        count: routes.length
      });

      message.success(`Loaded ${routes.length} routes!`);
    } catch (error) {
      message.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Render examples */}
    </div>
  );
};

// ============================================
// BACKEND ENDPOINT USAGE EXAMPLES
// ============================================

/*
// Python - Using requests library
import requests

response = requests.get(
    'http://localhost:8000/route',
    params={
        'oLat': 27.7136,
        'oLng': -97.3252,
        'dLat': 27.7200,
        'dLng': -97.3100
    }
)

if response.status_code == 200:
    polyline = response.json()['polyline']
    print(f"Route polyline: {polyline}")
else:
    print(f"Error: {response.json()}")
*/

/*
// JavaScript - Using fetch
async function getRoute() {
  try {
    const response = await fetch(
      'http://localhost:8000/route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100'
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Route polyline:', data.polyline);
    return data.polyline;
  } catch (error) {
    console.error('Error fetching route:', error);
  }
}
*/

/*
// cURL command
curl "http://localhost:8000/route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100"

// Response:
{
  "polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq"
}
*/

// ============================================
// COORDINATE SYSTEMS AND VALIDATION
// ============================================

/*
Valid Coordinate Ranges:
- Latitude: -90 to +90 (negative = South, positive = North)
- Longitude: -180 to +180 (negative = West, positive = East)

TAMUCC Campus Examples:
- Campus Center: 27.7136, -97.3252
- Engineering Building: 27.7150, -97.3240
- Student Center: 27.7200, -97.3100
- Library Building: 27.7180, -97.3200

Always validate coordinates before sending to backend!
*/

// ============================================
// POLYLINE DECODING EXPLAINED
// ============================================

/*
The Google Maps Directions API returns routes as encoded polylines.

Why Encoded Polylines?
- Smaller data size (important for large routes)
- Faster transmission
- Compressed format

Decoding process (handled by @mapbox/polyline):
1. Receive: "_p~iF~ps|U_ulLnnqC_mqNvxq"
2. Decode to coordinates: [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]
3. Convert lat/lng order: [[lat, lng], [lat, lng], ...]
4. Display on map with L.polyline()

Our route service handles all of this automatically!
*/

// ============================================
// ERROR HANDLING
// ============================================

/*
Example errors and how to handle them:

1. Missing API Key
   Response: 500 "Google Maps API key not configured"
   Fix: Add GOOGLE_MAPS_API_KEY to .env

2. Invalid Coordinates
   Response: 400 "Invalid origin coordinates"
   Fix: Ensure coordinates are within -90 to 90 (lat) and -180 to 180 (lng)

3. No Route Found
   Response: 404 "No route found between origin and destination"
   Fix: Check if coordinates are reachable; may be too far apart or invalid

4. Google API Error
   Response: 500 "Google Maps API error: [specific error]"
   Fix: Check Google API quotas or permissions; could be daily limit reached
*/

// ============================================
// INTEGRATION WITH LEAFLET MAP
// ============================================

/*
In your Map component:

import { Polyline } from 'react-leaflet';
import { getRouteCoordinates } from '../services/routeService';

const [routeCoords, setRouteCoords] = useState(null);

const fetchAndDisplayRoute = async (lat1, lng1, lat2, lng2) => {
  try {
    const coordinates = await getRouteCoordinates(lat1, lng1, lat2, lng2);
    setRouteCoords(coordinates);
  } catch (error) {
    console.error('Failed to fetch route:', error);
  }
};

// In JSX:
{routeCoords && (
  <Polyline
    positions={routeCoords}
    pathOptions={{
      color: '#667eea',
      weight: 4,
      opacity: 0.8,
    }}
  />
)}
*/
