# ✅ Google Directions Route - Setup Checklist

Complete these steps to get the route feature working:

## Step 1: Backend Setup (5 minutes)

- [ ] Navigate to `backend/` folder
- [ ] Run: `pip install googlemaps==4.10.0`
  - OR: `pip install -r requirements.txt`
- [ ] Verify installation: `pip show googlemaps`
- [ ] Check `backend/requirements.txt` has `googlemaps==4.10.0`

## Step 2: Get Google Maps API Key (10 minutes)

- [ ] Go to https://console.cloud.google.com/
- [ ] Create a new project (or select existing)
- [ ] Enable "Directions API" or "Routes API"
- [ ] Go to Credentials → Create API Key
- [ ] Copy the API key

## Step 3: Configure Environment (2 minutes)

- [ ] Open `backend/.env` (create if doesn't exist)
- [ ] Add this line: `GOOGLE_MAPS_API_KEY=your_api_key_here`
- [ ] Replace `your_api_key_here` with actual key from Step 2
- [ ] Save file

## Step 4: Frontend Setup (5 minutes)

- [ ] Navigate to `frontend/` folder
- [ ] Run: `npm install @mapbox/polyline`
  - OR: `npm install` (if you want to update all deps)
- [ ] Verify: `npm list @mapbox/polyline`
- [ ] Check `frontend/package.json` has `@mapbox/polyline`

## Step 5: Start Backend (2 minutes)

Open Terminal 1:
- [ ] `cd backend`
- [ ] Run: `python -m uvicorn main:app --reload`
- [ ] Wait for: `Uvicorn running on http://127.0.0.1:8000`
- [ ] Keep terminal open

## Step 6: Start Frontend (2 minutes)

Open Terminal 2:
- [ ] `cd frontend`
- [ ] Run: `npm run dev`
- [ ] Wait for: `Local: http://localhost:5173`
- [ ] Keep terminal open

## Step 7: Test the Feature (5 minutes)

1. [ ] Open browser to http://localhost:5173
2. [ ] Navigate to Interactive Map page
3. [ ] Look for "Get Route" button (top of sidebar)
4. [ ] Click "Get Route" button
5. [ ] Modal opens with coordinate input form
6. [ ] Enter test coordinates:
   - Origin Latitude: `27.7136`
   - Origin Longitude: `-97.3252`
   - Destination Latitude: `27.7200`
   - Destination Longitude: `-97.3100`
7. [ ] Click "Calculate Route"
8. [ ] Wait for route to appear
9. [ ] Route shows as purple line on map
10. [ ] Success message appears
11. [ ] Click "Clear Route" button
12. [ ] Route disappears from map

## Step 8: Verify Files

Check that all files exist:
- [ ] `backend/main.py` - Has `/route` endpoint
- [ ] `backend/requirements.txt` - Has `googlemaps`
- [ ] `frontend/package.json` - Has `@mapbox/polyline`
- [ ] `frontend/src/services/routeService.js` - Route utility
- [ ] `frontend/src/components/Map.jsx` - Route display
- [ ] `frontend/src/pages/InteractiveMap.jsx` - Route controls

## Step 9: Documentation Review

Read these files for reference:
- [ ] `ROUTE_QUICKSTART.md` - Quick reference
- [ ] `ROUTE_SETUP.md` - Detailed setup
- [ ] `ROUTE_EXAMPLES.js` - Code examples
- [ ] `VALIDATION_REPORT.md` - Implementation details

## Troubleshooting

### Issue: "Google Maps API key not configured"
**Solution:** 
- Add `GOOGLE_MAPS_API_KEY` to `.env`
- Restart backend server

### Issue: Route not showing
**Solution:**
- Check browser console (F12)
- Verify coordinates are in valid range
- Check backend is running on port 8000
- Try different coordinates

### Issue: Module not found error
**Solution:**
- Run `npm install @mapbox/polyline`
- Run `pip install googlemaps==4.10.0`
- Restart dev servers

### Issue: CORS error
**Solution:**
- Ensure backend runs on port 8000
- Ensure frontend runs on port 5173
- Check backend CORS middleware includes frontend origin

### Issue: "No route found"
**Solution:**
- Verify coordinates are different
- Try well-known campus locations
- Check if coordinates are reachable by road

## Success Criteria

✅ All checks complete when:
- [x] Backend `/route` endpoint responds to requests
- [x] Frontend "Get Route" button works
- [x] Route displays on map (purple line)
- [x] Error messages display appropriately
- [x] "Clear Route" button works
- [x] No errors in browser console
- [x] No errors in backend logs

## Next Steps (Optional Enhancements)

After everything works, you can:
- [ ] Add more building locations as route presets
- [ ] Display route distance and duration
- [ ] Show turn-by-turn directions
- [ ] Save favorite routes
- [ ] Calculate walking/transit routes
- [ ] Add real-time traffic
- [ ] Share routes with other users

---

## Quick Command Reference

```bash
# Backend setup
cd backend
pip install googlemaps==4.10.0
python -m uvicorn main:app --reload

# Frontend setup
cd frontend
npm install @mapbox/polyline
npm run dev

# Test route endpoint
curl "http://localhost:8000/route?oLat=27.7136&oLng=-97.3252&dLat=27.7200&dLng=-97.3100"
```

---

## Notes

- API key is required from Google Cloud Console
- Free tier includes 25,000 requests/day
- Route data is based on road network
- Some coordinate pairs may not have routes
- Results depend on Google Maps coverage in region

**Estimated Setup Time: 30-40 minutes**
**Most time: Getting/configuring Google API key**
