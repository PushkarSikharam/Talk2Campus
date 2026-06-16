# Talk2Campus

Talk2Campus is a campus-focused web application built to help students discover university events, register for activities, manage class schedules, and navigate campus more easily. The project combines a React frontend, a FastAPI backend, MongoDB storage, AI-assisted chat, and a live event sync pipeline powered by TAMUCC Engage.

## Overview

The application was designed to solve a few practical student problems in one place:

- finding current campus events
- understanding where events are happening
- checking whether events conflict with class schedules
- navigating to buildings on campus
- keeping event data fresh without manual entry

Talk2Campus mirrors official university events from TAMUCC Engage, stores them in MongoDB, and exposes them through a frontend that supports filtering, searching, registration tracking, and map-based discovery.

## Core Features

- User authentication with secure password hashing and cookie-based sessions
- Class schedule management for conflict checking
- Events page with search, filters, and detailed event modals
- Event registration and unregistration
- Interactive campus map using Leaflet and OpenStreetMap
- Real route generation using OpenRouteService
- Automatic TAMUCC Engage event sync with cleanup and indexing
- AI assistant endpoint for campus-related chat experiences

## Tech Stack

### Frontend

- React 18
- Vite
- Ant Design
- Axios
- Leaflet
- React Leaflet

### Backend

- FastAPI
- Motor / PyMongo
- MongoDB
- Python dotenv
- Passlib
- Python JOSE
- Requests

### External Services

- TAMUCC Engage event feed
- OpenRouteService Directions API
- OpenStreetMap tiles
- Google Gemini API for AI features

## Project Structure

```text
Talk2Campus/
|-- backend/
|   |-- ai.py
|   |-- auth.py
|   |-- db.py
|   |-- event_sync.py
|   |-- eventsCron.py
|   |-- main.py
|   |-- models.py
|   |-- requirements.txt
|   `-- .env.example
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- utils/
|   `-- package.json
|-- start-dev.bat
`-- README.md
```

## Architecture

### Frontend

The frontend is a single-page React application. It handles:

- login and authenticated user flows
- class schedule creation and display
- event browsing and filtering
- event registration UI
- interactive campus map rendering
- route visualization from the user's current location

### Backend

The backend provides REST endpoints for:

- authentication
- profile management
- class schedules
- event retrieval and sync
- event registration state
- route generation
- AI chat integration

### Data Flow

1. TAMUCC Engage events are pulled into MongoDB through the sync pipeline.
2. The backend normalizes and stores event data in the `events` collection.
3. The frontend requests upcoming events from `/events`.
4. Students can open details, check schedule conflicts, and register for events.

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- MongoDB database

### Backend Setup

From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment template:

```powershell
copy .env.example .env
```

Then update the values in `backend/.env`.

### Frontend Setup

From the project root:

```powershell
cd frontend
npm install
```

## Environment Variables

The backend uses the following environment variables.

```env
MONGO_URL=your_mongodb_connection_string
OPENROUTESERVICE_API_KEY=your_openrouteservice_key
OPENROUTESERVICE_BASE_URL=https://api.openrouteservice.org
ENGAGE_LOOKBACK_DAYS=30
ENGAGE_RETENTION_DAYS=60
EVENT_SYNC_ENABLED=true
EVENT_SYNC_INTERVAL_MINUTES=180
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
SECRET_KEY=your_jwt_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Running the Application

### Fastest Way

Use the included Windows launcher from the repository root:

```bat
start-dev.bat
```

This starts:

- frontend at `http://localhost:5173`
- backend at `http://127.0.0.1:8000`

### Manual Start

Backend:

```powershell
cd backend
python -m uvicorn backend.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## Event Sync

Talk2Campus mirrors event data from TAMUCC Engage into MongoDB.

### Manual Sync

Run:

```powershell
python -m backend.eventsCron
```

Or call:

```http
POST /events/sync
```

### Automatic Sync

The backend now supports background syncing on startup using:

- `EVENT_SYNC_ENABLED`
- `EVENT_SYNC_INTERVAL_MINUTES`

### Sync Behavior

The sync process:

- fetches approved Engage events
- keeps only recent and upcoming events within a configured lookback window
- normalizes fields for frontend use
- upserts by `source_id`
- removes stale events older than the retention window
- creates helpful indexes for event queries

## Main API Endpoints

### Authentication

- `POST /signup`
- `POST /login`
- `POST /logout`
- `GET /me`
- `PATCH /me`

### Class Schedule

- `POST /class_schedule`
- `GET /class_schedule`
- `DELETE /class_schedule/{id}`

### Events

- `GET /events`
- `POST /events/sync`
- `GET /events/{event_id}/is_registered`
- `POST /events/{event_id}/register`

### Registrations

- `GET /registrations`
- `DELETE /registrations/{registration_id}`

### Routing

- `GET /route`

### AI

- AI routes are mounted through `backend/ai.py`

## Important Changes Made

This project evolved significantly during development. The most important changes are documented here so future contributors understand both the implementation and the reasoning behind it.

### 1. Switched From Straight-Line Paths to Real Route Geometry

What changed:

- the map route flow now uses OpenRouteService
- the backend `/route` endpoint returns route coordinates
- the frontend renders real path geometry instead of a simple straight line

Why this changed:

- straight lines are visually misleading
- students need real walking or driving routes that follow roads and paths
- OpenRouteService works well with Leaflet and OpenStreetMap

### 2. Replaced the Google Legacy Directions Dependency

What changed:

- routing logic was moved away from the legacy Google Maps directions setup
- Leaflet remained the map renderer
- OpenRouteService became the routing engine

Why this changed:

- the legacy Google directions flow was returning `REQUEST_DENIED`
- the newer setup is simpler for this project and fits the existing map stack
- it avoids depending on a legacy API path that was not enabled for the project

### 3. Added Automatic Location-Based Routing

What changed:

- the route UI no longer depends on a manual "From" building selection
- navigation now starts from the user's current location when available

Why this changed:

- it removes unnecessary steps for users
- it better matches how students expect navigation to work

### 4. Fixed the Interactive Map Blank Screen Issue

What changed:

- frontend rendering issues were corrected
- missing imports and layout problems were resolved

Why this changed:

- the page loaded visually but displayed no useful content
- this blocked core functionality even though routing logic existed underneath

### 5. Added TAMUCC Engage Event Mirroring

What changed:

- a dedicated event sync module was added in `backend/event_sync.py`
- a cron-style sync entry point was added in `backend/eventsCron.py`
- the backend now supports syncing via API and startup behavior

Why this changed:

- manual event entry does not scale
- the official university source should remain the system of record
- this keeps the application relevant and current

### 6. Fixed the "No Events Found" Issue

What changed:

- event sync now pulls recent and relevant events instead of historical data only
- stale data cleanup was added
- `/events` can self-heal by triggering a sync when needed

Why this changed:

- the database contained thousands of old events, many dating far into the past
- the frontend correctly filtered out past events, which made the UI look empty
- the real problem was stale data, not the filter itself

### 7. Upgraded the Events Experience

What changed:

- search was added
- filters were added for time, place, theme, and organization
- loading, error, and empty states were improved
- richer event detail modals now show more metadata

Why this changed:

- event discovery needed to feel useful, not just technically present
- clearer states help users understand whether data is loading, missing, or filtered out
- richer metadata improves trust and usability

### 8. Added Event Data Cleanup and Indexing

What changed:

- stale events are deleted based on a retention window
- MongoDB indexes are created for event queries and sync efficiency

Why this changed:

- large historical collections make queries slower and the dataset harder to manage
- indexes improve performance and support ongoing sync health

## Event Data Model Highlights

Events are normalized to include fields like:

- `id`
- `source_id`
- `title`
- `description`
- `location`
- `shortLocation`
- `startsOn`
- `endsOn`
- `startsOn_dt`
- `endsOn_dt`
- `organizationNames`
- `theme`
- `categoryNames`
- `benefitNames`
- `rsvpTotal`
- `imageUrl`
- `externalUrl`
- `lastSyncedAt`

## Troubleshooting

### Events Page Shows No Events

Check:

- `MONGO_URL` is set correctly
- backend can reach MongoDB
- manual sync works
- background sync is enabled if expected

Try:

```powershell
python -m backend.eventsCron
```

### Map Shows No Real Route

Check:

- `OPENROUTESERVICE_API_KEY` is valid
- backend is running
- browser location access is allowed

### `/me` Returns 401

This is normal if the user is not logged in yet.

### Frontend Cannot Reach Backend

Confirm:

- backend is running on port `8000`
- frontend is running on port `5173`
- the frontend is using the expected local API base behavior

## Development Notes

- authentication uses secure password hashing
- cookies are currently configured for local development
- in production, cookie `secure` settings should be enabled under HTTPS
- event sync logic is intentionally isolated so it can later be scheduled externally if needed

## Verification

Recent verification work completed during development included:

- backend import checks
- frontend linting
- frontend production build
- live event sync validation against MongoDB
- live confirmation that current upcoming events are returned

## Future Improvements

- admin dashboard for sync health and last-run status
- analytics for popular events and registration trends
- push or email reminders for registered events
- stronger production deployment documentation
- code-splitting for the large frontend build output

## License

This project currently does not declare a formal license. Add one before public distribution.
