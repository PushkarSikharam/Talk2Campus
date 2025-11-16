# Google Directions Route - Quick Start

## Installation Steps

### 1. Backend Setup

```bash
cd backend

# Install new dependencies
pip install googlemaps==4.10.0

# Or update all requirements
pip install -r requirements.txt
```

### 2. Configure Google Maps API

Edit `backend/.env` and add:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

Get your API key from: https://console.cloud.google.com/

### 3. Frontend Setup

```bash
cd frontend

# Install new dependencies
npm install @mapbox/polyline

# Or update all packages
npm install
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload
```

Backend runs on: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173

## Quick Test

1. Open http://localhost:5173 in browser
2. Click "Get Route" button
3. Enter coordinates:
   - Origin: 27.7136, -97.3252 (Campus Center area)
   - Destination: 27.7200, -97.3100 (Different campus area)
4. Click "Calculate Route"
5. Route appears on map in purple

## Files Modified/Created

### Backend
- `backend/main.py` - Added `/route` endpoint
- `backend/requirements.txt` - Added googlemaps

### Frontend
- `frontend/package.json` - Added @mapbox/polyline
- `frontend/src/services/routeService.js` - New route service (created)
- `frontend/src/components/Map.jsx` - Updated for route display
- `frontend/src/pages/InteractiveMap.jsx` - Updated with route controls

### Documentation
- `ROUTE_SETUP.md` - Complete setup guide
- This file

## API Endpoint

```
GET /route?oLat={lat}&oLng={lng}&dLat={lat}&dLng={lng}

Response:
{
  "polyline": "encoded_polyline_string"
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not configured" | Add GOOGLE_MAPS_API_KEY to .env |
| Route not appearing | Check browser console, verify coordinates are valid |
| Module not found errors | Run `npm install` or `pip install -r requirements.txt` |
| CORS errors | Verify backend is running on port 8000 |

## Next Steps

- Test with different campus coordinates
- Add route distance/duration display
- Implement route caching
- Add alternative route support
- Integrate with building selection for one-click routing
