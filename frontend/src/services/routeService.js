import axios from 'axios';

const logRouteServiceIssue = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

/**
 * Fetch a route from the backend and return coordinates.
 */
export const getRouteCoordinates = async (
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  mode = 'driving'
) => {
  const details = await getRouteDetails(originLat, originLng, destinationLat, destinationLng, mode);
  return details.coordinates;
};

export const getRouteDetails = async (
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  mode = 'driving',
  client = axios
) => {
  try {
    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      throw new Error('All coordinates are required');
    }

    if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destinationLat, destinationLng)) {
      throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
    }

    const response = await client.get('/route', {
      params: {
        oLat: originLat,
        oLng: originLng,
        dLat: destinationLat,
        dLng: destinationLng,
        mode,
      },
    });

    return {
      coordinates: response.data.coordinates || [],
      distanceMeters: Number(response.data.distanceMeters) || null,
      durationSeconds: Number(response.data.durationSeconds) || null,
      steps: Array.isArray(response.data.steps) ? response.data.steps : [],
    };
  } catch (error) {
    logRouteServiceIssue('Error fetching route:', error?.message || error);
    throw error;
  }
};

const isValidCoordinate = (lat, lng) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

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

  return { north, south, east, west };
};

export const calculateCenter = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const bounds = calculateBounds(coordinates);
  return [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2];
};
