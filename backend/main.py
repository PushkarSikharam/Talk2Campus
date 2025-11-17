from typing import List, Optional, Tuple
import os
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request, Response, Cookie
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from bson.objectid import ObjectId
import googlemaps

from .db import get_users_collection, get_class_schedule_collection, get_events_collection, get_registrations_collection
from .models import UserIn, UserOut, UserInDB, LoginIn, ClassScheduleIn, ClassScheduleOut
from .auth import hash_password, verify_password, create_access_token, decode_access_token

load_dotenv()

app = FastAPI(title='Talk2Campus Backend')

# Initialize Google Maps client (requires GOOGLE_MAPS_API_KEY in .env)
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
gmaps_client = googlemaps.Client(key=GOOGLE_MAPS_API_KEY) if GOOGLE_MAPS_API_KEY else None

# Allow dev frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


users = get_users_collection()
class_schedule = get_class_schedule_collection()
def get_current_user(authorization: str = Header(None), access_token: str = Cookie(None)):
    token = None
    if authorization:
        scheme, _, token_part = authorization.partition(' ')
        if scheme.lower() == 'bearer' and token_part:
            token = token_part
    if not token and access_token:
        token = access_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing authorization')
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    return payload
@app.post('/class_schedule', response_model=ClassScheduleOut)
async def add_class_schedule(data: ClassScheduleIn, payload: dict = Depends(get_current_user)):
    # Insert new class schedule, associate with current user
    user_id = payload.get('sub')
    doc = data.dict()
    doc['owner_id'] = user_id
    # Convert date objects to ISO strings because PyMongo/BSON does not accept plain datetime.date
    try:
        if 'dates' in doc and isinstance(doc['dates'], list):
            doc['dates'] = [d.isoformat() if hasattr(d, 'isoformat') else d for d in doc['dates']]
    except Exception:
        # fallback: leave as-is
        pass
    res = await class_schedule.insert_one(doc)
    # Return stored document with id
    return ClassScheduleOut(id=str(res.inserted_id), **doc)


@app.get('/class_schedule', response_model=List[ClassScheduleOut])
async def get_class_schedules(payload: dict = Depends(get_current_user)):
    # Return only schedules owned by current user
    user_id = payload.get('sub')
    docs = await class_schedule.find({'owner_id': user_id}).to_list(length=100)
    # Convert MongoDB _id to id string
    return [ClassScheduleOut(id=str(doc['_id']),
                             owner_id=doc.get('owner_id'),
                             course=doc['course'],
                             name=doc['name'],
                             days=doc['days'],
                             time=doc['time'],
                             dates=doc['dates']) for doc in docs]


@app.delete('/class_schedule/{id}')
async def delete_class_schedule(id: str, payload: dict = Depends(get_current_user)):
    """Delete a class schedule owned by the current user."""
    user_id = payload.get('sub')
    try:
        res = await class_schedule.delete_one({'_id': ObjectId(id), 'owner_id': user_id})
    except Exception:
        # invalid id format or other error
        raise HTTPException(status_code=400, detail='Invalid id')
    if res.deleted_count == 0:
        # Not found or not owned by user
        raise HTTPException(status_code=404, detail='Not found or not owner')
    return JSONResponse(status_code=200, content={"detail": "deleted"})

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

@app.post('/signup', response_model=UserOut)
async def signup(user: UserIn):
    # check existing
    existing = await users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    try:
        hashed = hash_password(user.password)
    except Exception as e:
        # Hashing issues -> return client error
        raise HTTPException(status_code=400, detail=f'Password hashing failed: {e}')
    doc = {"name": user.name, "email": user.email, "hashed_password": hashed}
    res = await users.insert_one(doc)
    return UserOut(id=str(res.inserted_id), name=user.name, email=user.email)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # ensure JSON response for HTTPException
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # log error and return JSON
    import traceback, logging
    logging.getLogger('uvicorn.error').exception('Unhandled exception')
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Return a simplified validation error message without echoing request body
    return JSONResponse(status_code=422, content={"detail": "Invalid request data"})

@app.post('/login')
async def login(form_data: LoginIn, response: Response):
    # Using same model with email/password for simplicity
    user = await users.find_one({"email": form_data.email})
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    # verify password
    try:
        ok = verify_password(form_data.password, user.get('hashed_password'))
    except Exception:
        # Do not leak error details
        raise HTTPException(status_code=500, detail='Error during password verification')
    if not ok:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = create_access_token({"sub": str(user.get('_id')), "email": user.get('email')})
    # set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # set True in production with HTTPS
        max_age=60 * 60,
    )
    return {"detail": "login successful"}


@app.post('/logout')
async def logout(response: Response):
    """Clear the auth cookie to log the user out."""
    # Clear cookie by setting it to empty and expiring it immediately
    response.delete_cookie(key='access_token')
    # Also set an expired cookie for clients that observe Set-Cookie attributes explicitly
    response.set_cookie(key='access_token', value='', httponly=True, samesite='lax', secure=False, max_age=0)
    return {"detail": "logged out"}

def get_current_user(authorization: str = Header(None), access_token: str = Cookie(None)):
    token = None
    if authorization:
        scheme, _, token_part = authorization.partition(' ')
        if scheme.lower() == 'bearer' and token_part:
            token = token_part
    if not token and access_token:
        token = access_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing authorization')
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    return payload

@app.get('/me')
async def me(payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    user = await users.find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {"id": str(user.get('_id')), "name": user.get('name'), "email": user.get('email'), "phone": user.get('phone')}


@app.patch('/me')
async def update_me(data: UpdateProfile, payload: dict = Depends(get_current_user)):
    """Update current user's profile. Password change is optional; if provided,
    currentPassword must match the existing password and newPassword will replace it.
    """
    user_id = payload.get('sub')
    user = await users.find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    updates = {}
    if data.name is not None:
        updates['name'] = data.name
    if data.email is not None:
        updates['email'] = data.email
    if data.phone is not None:
        updates['phone'] = data.phone

    # Handle password change if requested
    if data.newPassword is not None or data.currentPassword is not None:
        # both must be present
        if not data.currentPassword or not data.newPassword:
            raise HTTPException(status_code=400, detail='Both currentPassword and newPassword are required to change password')
        try:
            ok = verify_password(data.currentPassword, user.get('hashed_password'))
        except Exception:
            raise HTTPException(status_code=500, detail='Error verifying password')
        if not ok:
            raise HTTPException(status_code=401, detail='Current password incorrect')
        # set new hashed password
        try:
            updates['hashed_password'] = hash_password(data.newPassword)
        except Exception:
            raise HTTPException(status_code=500, detail='Failed to hash new password')

    if updates:
        await users.update_one({'_id': ObjectId(user_id)}, {'$set': updates})

    # Return updated public fields
    new_user = await users.find_one({'_id': ObjectId(user_id)})
    return {"id": str(new_user.get('_id')), "name": new_user.get('name'), "email": new_user.get('email'), "phone": new_user.get('phone')}


@app.get('/route')
async def get_route(oLat: float, oLng: float, dLat: float, dLng: float, mode: str = 'driving'):
    """
    Get the encoded polyline for a route between two coordinates using Google Maps Directions API.
    
    Query Parameters:
    - oLat: Origin latitude
    - oLng: Origin longitude
    - dLat: Destination latitude
    - dLng: Destination longitude
    - mode: Travel mode ('driving', 'walking', 'transit', 'bicycling') - defaults to 'driving'
    
    Returns:
    - polyline: Encoded polyline string representing the route
    """
    if not gmaps_client:
        raise HTTPException(
            status_code=500,
            detail='Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env'
        )
    
    # Validate mode parameter
    valid_modes = ['driving', 'walking', 'transit', 'bicycling']
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f'Invalid mode. Must be one of: {", ".join(valid_modes)}')
    
    try:
        # Validate coordinates
        if not (-90 <= oLat <= 90 and -180 <= oLng <= 180):
            raise HTTPException(status_code=400, detail='Invalid origin coordinates')
        if not (-90 <= dLat <= 90 and -180 <= dLng <= 180):
            raise HTTPException(status_code=400, detail='Invalid destination coordinates')
        
        # Call Google Maps Directions API
        origin = (oLat, oLng)
        destination = (dLat, dLng)

        directions_result = gmaps_client.directions(
            origin=origin,
            destination=destination,
            mode=mode,
            alternatives=False
        )
        
        if not directions_result or len(directions_result) == 0:
            raise HTTPException(status_code=404, detail='No route found between origin and destination')
        
        # Extract the polyline from the first route
        route = directions_result[0]
        polyline = route['overview_polyline']['points']
        
        return {"polyline": polyline}
    
    except googlemaps.exceptions.ApiError as e:
        raise HTTPException(status_code=500, detail=f'Google Maps API error: {str(e)}')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error computing route: {str(e)}')


@app.get('/events')
async def get_events(limit: int = 6, when: Optional[str] = None):
    """Return events. By default returns upcoming events whose end time is after now.
    If `when=today` is provided, returns events that occur any time during the current UTC day.
    Limit defaults to 6.
    """
    try:
        events_col = get_events_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Events collection not available')

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    # Build query depending on `when` parameter
    if when and when.lower() == 'today':
        # UTC day boundaries
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        day_end = day_start + timedelta(days=1)

        # Match events whose start is before end of day AND whose end is after start of day (or has no end)
        query = {
            "$or": [
                {"$and": [
                    {"startsOn_dt": {"$lte": day_end}},
                    {"$or": [ {"endsOn_dt": {"$gte": day_start}}, {"endsOn_dt": {"$exists": False}} ]}
                ]},
                {"$and": [
                    {"startsOn": {"$lte": day_end.isoformat()}},
                    {"$or": [ {"endsOn": {"$gte": day_start.isoformat()}}, {"endsOn": {"$exists": False}} ]}
                ]}
            ]
        }
    else:
        # Default: upcoming events ending after now
        query = {
            "$or": [
                {"endsOn_dt": {"$gte": now}},
                {"endsOn": {"$gte": now.isoformat()}}
            ]
        }

    # Sort by start time if available, otherwise by endsOn
    cursor = events_col.find(query).sort([('startsOn_dt', 1), ('endsOn', 1)])
    docs = await cursor.to_list(length=limit)

    # Convert ObjectId and datetimes to JSON-serializable
    out = []
    for d in docs:
        doc = dict(d)
        # string-ify _id
        try:
            doc['id'] = str(doc.get('_id'))
        except Exception:
            doc['id'] = doc.get('_id')
        doc.pop('_id', None)

        # normalize common fields
        # startsOn_dt / endsOn_dt are likely stored as datetimes; convert to ISO
        if isinstance(doc.get('startsOn_dt'), datetime):
            doc['startsOn_dt'] = doc['startsOn_dt'].astimezone(timezone.utc).isoformat()
        if isinstance(doc.get('endsOn_dt'), datetime):
            doc['endsOn_dt'] = doc['endsOn_dt'].astimezone(timezone.utc).isoformat()

        out.append(doc)

    return out


@app.get('/events/{event_id}/is_registered')
async def is_registered(event_id: str, payload: dict = Depends(get_current_user)):
    """Return whether the current user is registered for the given event."""
    try:
        regs = get_registrations_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Registrations collection not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    existing = await regs.find_one({'event_id': event_id, 'user_id': user_id})
    return {'registered': bool(existing)}


@app.post('/events/{event_id}/register')
async def register_event(event_id: str, payload: dict = Depends(get_current_user)):
    """Register the current user for the event (id).

    If already registered, returns registered=True without duplicating.
    """
    try:
        regs = get_registrations_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Registrations collection not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    # Prevent duplicates
    existing = await regs.find_one({'event_id': event_id, 'user_id': user_id})
    if existing:
        return {'registered': True, 'id': str(existing.get('_id'))}

    from datetime import datetime, timezone

    # Attempt to fetch the event document to snapshot key fields into the registration
    try:
        events_col = get_events_collection()
    except Exception:
        events_col = None

    event_snapshot = None
    if events_col is not None:
        # try several lookup strategies
        try:
            if ObjectId.is_valid(event_id):
                ed = await events_col.find_one({'_id': ObjectId(event_id)})
            else:
                ed = await events_col.find_one({'id': event_id}) or await events_col.find_one({'source_id': event_id})
        except Exception:
            ed = None
        if ed:
            # convert _id to id string and keep common fields
            try:
                ed['id'] = str(ed.get('_id'))
            except Exception:
                ed['id'] = ed.get('_id')
            ed.pop('_id', None)
            # Normalize organization names from several possible shapes
            org_names = []
            try:
                # Direct array of names
                if ed.get('organizationNames') and isinstance(ed.get('organizationNames'), list):
                    org_names = [str(x) for x in ed.get('organizationNames') if x]
                # Single string
                elif ed.get('organizationNames') and isinstance(ed.get('organizationNames'), str):
                    org_names = [ed.get('organizationNames')]
                # organizations can be array of strings or objects
                elif ed.get('organizations') and isinstance(ed.get('organizations'), list):
                    for o in ed.get('organizations'):
                        if not o: continue
                        if isinstance(o, str):
                            org_names.append(o)
                        elif isinstance(o, dict):
                            org_names.append(o.get('name') or o.get('title') or o.get('displayName') or str(o))
                # organizer / organizers
                elif ed.get('organizers') and isinstance(ed.get('organizers'), list):
                    org_names = [str(x) for x in ed.get('organizers') if x]
                elif ed.get('organizer'):
                    if isinstance(ed.get('organizer'), list):
                        org_names = [str(x) for x in ed.get('organizer') if x]
                    else:
                        org_names = [str(ed.get('organizer'))]
                # hosts / sponsors / org
                elif ed.get('hosts'):
                    org_names = [str(x) for x in (ed.get('hosts') if isinstance(ed.get('hosts'), list) else [ed.get('hosts')]) if x]
                elif ed.get('sponsors'):
                    org_names = [str(x) for x in (ed.get('sponsors') if isinstance(ed.get('sponsors'), list) else [ed.get('sponsors')]) if x]
                elif ed.get('org'):
                    org_names = [str(ed.get('org'))]
                # try nested properties.source_name
                elif (ed.get('properties') or {}).get('source_name'):
                    org_names = [str((ed.get('properties') or {}).get('source_name'))]
            except Exception:
                org_names = []

            event_snapshot = {
                'id': ed.get('id'),
                'title': ed.get('title') or ed.get('name') or (ed.get('properties') or {}).get('name') or (ed.get('properties') or {}).get('source_name'),
                'location': ed.get('location') or ed.get('venue') or (ed.get('properties') or {}).get('address'),
                'startsOn': ed.get('startsOn_dt') or ed.get('startsOn'),
                'endsOn': ed.get('endsOn_dt') or ed.get('endsOn'),
                'organizationNames': org_names,
            }

    doc = {
        'event_id': event_id,
        'user_id': user_id,
        'created_at': datetime.now(timezone.utc),
        'event_snapshot': event_snapshot,
    }
    res = await regs.insert_one(doc)
    return {'registered': True, 'id': str(res.inserted_id)}


@app.get('/registrations')
async def get_my_registrations(limit: int = 50, payload: dict = Depends(get_current_user)):
    """Return registrations for the current user, including event documents when available."""
    try:
        regs = get_registrations_collection()
        events_col = get_events_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Collections not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    # Support registrations saved with either a string user_id or an ObjectId user_id
    query = {'$or': [{'user_id': user_id}]}
    try:
        if ObjectId.is_valid(user_id):
            query['$or'].append({'user_id': ObjectId(user_id)})
    except Exception:
        pass
    cursor = regs.find(query).sort('created_at', -1)
    reg_docs = await cursor.to_list(length=limit)

    out = []
    for r in reg_docs:
        event_id = r.get('event_id')
        # Prefer an embedded snapshot if available (safer)
        event_doc = r.get('event_snapshot')
        # If no snapshot, try to find the event in events collection using several strategies
        if not event_doc and event_id and (events_col is not None):
            event_doc = None
            try:
                if ObjectId.is_valid(event_id):
                    event_doc = await events_col.find_one({'_id': ObjectId(event_id)})
                if not event_doc:
                    # try common alternative keys
                    event_doc = await events_col.find_one({'id': event_id})
                if not event_doc:
                    event_doc = await events_col.find_one({'source_id': event_id})
                if not event_doc:
                    # sometimes id stored under properties.source_id or properties.source_name
                    event_doc = await events_col.find_one({'properties.source_id': event_id})
            except Exception:
                event_doc = None
            if event_doc:
                try:
                    event_doc['id'] = str(event_doc.get('_id'))
                except Exception:
                    event_doc['id'] = event_doc.get('_id')
                event_doc.pop('_id', None)

        out.append({'registration_id': str(r.get('_id')), 'created_at': r.get('created_at'), 'event': event_doc})

    return out


@app.get('/registrations/user/{user_id}')
async def get_registrations_for_user(user_id: str, limit: int = 50, payload: dict = Depends(get_current_user)):
    """Return registrations for a specific user id. Caller must be the same user.

    This endpoint allows the frontend (or API client) to request registrations for a given
    user id but only when authenticated as that user.
    """
    caller_id = payload.get('sub')
    if not caller_id:
        raise HTTPException(status_code=401, detail='Missing user id')
    # Only allow users to fetch their own registrations
    if caller_id != user_id:
        raise HTTPException(status_code=403, detail='Forbidden')

    try:
        regs = get_registrations_collection()
        events_col = get_events_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Collections not available')

    # Support registrations saved with either a string user_id or an ObjectId user_id
    query = {'$or': [{'user_id': user_id}]}
    try:
        if ObjectId.is_valid(user_id):
            query['$or'].append({'user_id': ObjectId(user_id)})
    except Exception:
        pass
    cursor = regs.find(query).sort('created_at', -1)
    reg_docs = await cursor.to_list(length=limit)

    out = []
    for r in reg_docs:
        event_id = r.get('event_id')
        event_doc = r.get('event_snapshot')
        if not event_doc and event_id and (events_col is not None):
            try:
                if ObjectId.is_valid(event_id):
                    event_doc = await events_col.find_one({'_id': ObjectId(event_id)})
                if not event_doc:
                    event_doc = await events_col.find_one({'id': event_id})
                if not event_doc:
                    event_doc = await events_col.find_one({'source_id': event_id})
            except Exception:
                event_doc = None
            if event_doc:
                try:
                    event_doc['id'] = str(event_doc.get('_id'))
                except Exception:
                    event_doc['id'] = event_doc.get('_id')
                event_doc.pop('_id', None)

        out.append({'registration_id': str(r.get('_id')), 'created_at': r.get('created_at'), 'event': event_doc})

    return out


@app.delete('/registrations/{registration_id}')
async def delete_registration(registration_id: str, payload: dict = Depends(get_current_user)):
    """Delete a registration owned by the current user."""
    try:
        regs = get_registrations_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Registrations collection not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    # Validate ObjectId
    try:
        oid = ObjectId(registration_id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid registration id')

    res = await regs.delete_one({'_id': oid, 'user_id': user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Registration not found or not owned by user')
    return {'deleted': True}
