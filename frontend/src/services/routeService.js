import axios from 'axios';
import polyline from '@mapbox/polyline';

const API_BASE = 'http://localhost:8000';

/**
 * Fetch a route from the backend and return decoded coordinates
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destinationLat - Destination latitude
 * @param {number} destinationLng - Destination longitude
 * @param {string} mode - Travel mode ('driving', 'walking', etc.) - defaults to 'driving'
 * @returns {Promise<Array>} Array of [lat, lng] coordinate pairs
 */
export const getRouteCoordinates = async (originLat, originLng, destinationLat, destinationLng, mode = 'driving') => {
  try {
    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      throw new Error('All coordinates are required');
    }

    // Validate coordinate ranges
    if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destinationLat, destinationLng)) {
      throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
    }

    const response = await axios.get(`${API_BASE}/route`, {
      params: {
        oLat: originLat,
        oLng: originLng,
        dLat: destinationLat,
        dLng: destinationLng,
        mode: mode,
      },
    });

    const encodedPolyline = response.data.polyline;

    // Decode the polyline to get coordinates
    const coordinates = polyline.toGeoJSON(encodedPolyline);
    
    // Convert from GeoJSON format to [lat, lng] array
    const routeCoords = coordinates.coordinates.map(([lng, lat]) => [lat, lng]);

    return routeCoords;
  } catch (error) {
    console.error('Error fetching route:', error.message);
    throw error;
  }
};

/**
 * Validate if a coordinate pair is within valid ranges
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid, false otherwise
 */
const isValidCoordinate = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Calculate bounds from a set of coordinates
 * @param {Array<Array>} coordinates - Array of [lat, lng] pairs
 * @returns {Object} Bounds object with north, south, east, west
 */
export const calculateBounds = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let north = coordinates[0][0];
  let south = coordinates[0][0];
  let east = coordinates[0][1];
  let west = coordinates[0][1];

  coordinates.forEach(([lat, lng]) => {
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    west = Math.min(west, lng);
  });

  return {
    north,
    south,
    east,
    west,
  };
};

/**
 * Calculate the center point of coordinates
 * @param {Array<Array>} coordinates - Array of [lat, lng] pairs
 * @returns {Array} [lat, lng] of center point
 */
export const calculateCenter = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const bounds = calculateBounds(coordinates);
  return [
    (bounds.north + bounds.south) / 2,
    (bounds.east + bounds.west) / 2,
  ];
};
