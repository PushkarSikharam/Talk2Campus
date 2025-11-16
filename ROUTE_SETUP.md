# Google Directions Route Support - Setup Guide

## Overview

This implementation adds Google Maps Directions Route support to the Talk2Campus project, allowing users to:
- Input origin and destination coordinates
- Fetch a route from the Google Maps Directions API
- Display the route on the Leaflet map with an encoded polyline
- Fit the map bounds to show the entire route

## Backend Changes

### 1. Dependencies Added

**File: `backend/requirements.txt`**
- Added `googlemaps==4.10.0` for Google Maps API client

### 2. New Endpoint: `/route`

**File: `backend/main.py`**

Added a new GET endpoint that:
- Accepts query parameters: `oLat`, `oLng`, `dLat`, `dLng`
- Calls Google Maps Directions API
- Returns the encoded polyline: `{ "polyline": "encoded_data_here" }`

**Endpoint Details:**
```
GET /route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100

Response:
{
  "polyline": "encoded_polyline_string"
}
```

**Error Handling:**
- Invalid coordinates (outside valid lat/lng ranges)
- Missing Google Maps API key
- No route found between points
- Google Maps API errors

### 3. Configuration Required

**File: `.env`**
Add your Google Maps API key:
```env
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

To get an API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the "Routes API" (or "Directions API")
4. Create an API key in Credentials
5. Add the key to `.env`

## Frontend Changes

### 1. Dependencies Added

**File: `frontend/package.json`**
- Added `@mapbox/polyline@^1.1.1` for polyline decoding

Install dependencies:
```bash
cd frontend
npm install
```

### 2. New Service: Route Service

**File: `frontend/src/services/routeService.js`**

Provides utility functions:
- `getRouteCoordinates(originLat, originLng, destLat, destLng)` - Fetches and decodes route
- `calculateBounds(coordinates)` - Calculates bounding box for route
- `calculateCenter(coordinates)` - Finds center point of route

### 3. Updated Map Component

**File: `frontend/src/components/Map.jsx`**

Changes:
- Added `Polyline` import from react-leaflet
- Added `routeCoordinates` prop to display route
- Added `onRouteChange` callback for route updates
- Route is displayed in purple (#667eea) with 4px weight

### 4. Updated InteractiveMap Page

**File: `frontend/src/pages/InteractiveMap.jsx`**

Changes:
- Added route state management
- Added "Get Route" button to open route calculation modal
- Added "Clear Route" button to remove displayed route
- Added Modal with form for coordinate input
- Integrated route service to fetch and display routes
- Added loading state and error messages

## Usage

### For Users

1. **Calculate a Route:**
   - Click the "Get Route" button on the InteractiveMap page
   - Enter origin coordinates (latitude/longitude)
   - Enter destination coordinates
   - Click "Calculate Route"
   - The route will be displayed on the map in purple

2. **Clear the Route:**
   - Click the "Clear Route" button to remove the displayed route

### For Developers

**Example API Call:**
```javascript
import { getRouteCoordinates } from './services/routeService';

const coordinates = await getRouteCoordinates(
  27.7136,  // origin latitude
  -97.3252, // origin longitude
  27.7200,  // destination latitude
  -97.3100  // destination longitude
);

// Returns array of [lat, lng] coordinate pairs
// Example: [[27.7136, -97.3252], [27.7150, -97.3240], ...]
```

**Example Backend Call:**
```bash
curl "http://localhost:8000/route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100"
```

## Project Structure

```
Talk2Campus/
├── backend/
│   ├── main.py                 # Added /route endpoint
│   └── requirements.txt         # Added googlemaps
│
└── frontend/
    ├── package.json            # Added @mapbox/polyline
    ├── src/
    │   ├── components/
    │   │   └── Map.jsx         # Updated for route display
    │   ├── pages/
    │   │   └── InteractiveMap.jsx  # Updated with route controls
    │   └── services/
    │       └── routeService.js # New route utility service
```

## Technical Details

### Polyline Encoding

Google Maps Directions API returns routes as encoded polylines. The `@mapbox/polyline` library decodes these:

```
Encoded: `_p~iF~ps|U_ulLnnqC_mqNvxq`

Decoded: [
  [38.5, -120.2],
  [40.7, -120.95],
  [43.252, -126.453]
]
```

### Route Display

Routes are displayed using Leaflet's `L.Polyline` (via react-leaflet's `<Polyline>`) with:
- Color: #667eea (purple)
- Weight: 4px
- Opacity: 0.8
- Smooth line joins and caps

### Coordinate Validation

All coordinates are validated:
- Latitude: -90 to 90
- Longitude: -180 to 180

### Error Handling

- **Missing API Key:** Server returns 500 error with configuration message
- **Invalid Coordinates:** Returns 400 error
- **No Route Found:** Returns 404 error
- **API Errors:** Returns 500 error with Google error message

## Notes

- Using OpenStreetMap tiles (not Google Maps tiles) per requirements
- All code uses async/await for clean asynchronous handling
- Professional error handling and user feedback
- No authentication required for /route endpoint (can be added later)
- Backend uses FastAPI with existing CORS middleware
- Frontend uses Ant Design components for UI consistency

## Testing

1. **Backend:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```
   
   Test with curl or Postman:
   ```
   GET http://localhost:8000/route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   
   Visit http://localhost:5173 and click "Get Route" button

## Troubleshooting

**Issue: "Google Maps API key not configured"**
- Solution: Add `GOOGLE_MAPS_API_KEY` to `.env` file

**Issue: Route not displaying**
- Check browser console for errors
- Ensure coordinates are in valid range
- Verify backend is running on port 8000

**Issue: "No route found"**
- Check if coordinates are reachable by car
- Ensure origin and destination are different

**Issue: Polyline decoding error**
- Verify `@mapbox/polyline` is installed: `npm install @mapbox/polyline`
- Restart frontend dev server

## Future Enhancements

- Add multiple route alternatives
- Support different travel modes (walking, transit, cycling)
- Add route details (distance, duration, turns)
- Store favorite routes
- Share routes with other users
- Real-time traffic conditions
