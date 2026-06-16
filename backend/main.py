from typing import List, Optional
import os
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from bson.objectid import ObjectId
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .auth import create_access_token, decode_access_token, hash_password, verify_password
from .db import (
    get_class_schedule_collection,
    get_events_collection,
    get_registrations_collection,
    get_users_collection,
)
from .event_sync import sync_events
from .models import ClassScheduleIn, ClassScheduleOut, LoginIn, UserIn, UserOut

env_file = Path(__file__).resolve().parent / '.env'
load_dotenv(env_file)

app = FastAPI(title='Talk2Campus Backend')
logger = logging.getLogger(__name__)


def _parse_csv_env(name: str, default: str = '') -> List[str]:
    raw_value = os.getenv(name, default)
    return [item.strip() for item in raw_value.split(',') if item.strip()]


def _parse_bool_env(name: str, default: str = 'false') -> bool:
    return os.getenv(name, default).strip().lower() in {'1', 'true', 'yes', 'on'}


OPENROUTESERVICE_API_KEY = os.getenv('OPENROUTESERVICE_API_KEY', '')
OPENROUTESERVICE_BASE_URL = os.getenv('OPENROUTESERVICE_BASE_URL', 'https://api.openrouteservice.org')
EVENT_SYNC_ENABLED = os.getenv('EVENT_SYNC_ENABLED', 'true').lower() == 'true'
EVENT_SYNC_INTERVAL_MINUTES = max(int(os.getenv('EVENT_SYNC_INTERVAL_MINUTES', '180')), 5)
CORS_ORIGINS = _parse_csv_env('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:5174')
COOKIE_SECURE = _parse_bool_env('COOKIE_SECURE', 'false')
COOKIE_SAMESITE = os.getenv('COOKIE_SAMESITE', 'lax').strip().lower()
COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN', '').strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

users = get_users_collection()
class_schedule = get_class_schedule_collection()


async def background_event_sync_loop():
    interval_seconds = EVENT_SYNC_INTERVAL_MINUTES * 60
    logger.info('Background event sync started. Interval=%s minutes.', EVENT_SYNC_INTERVAL_MINUTES)
    while True:
        try:
            await asyncio.to_thread(sync_events)
            logger.info('Background event refresh complete.')
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception('Background event sync failed.')
        await asyncio.sleep(interval_seconds)


@app.on_event('startup')
async def startup_event():
    if EVENT_SYNC_ENABLED:
        app.state.event_sync_task = asyncio.create_task(background_event_sync_loop())
    else:
        app.state.event_sync_task = None


@app.on_event('shutdown')
async def shutdown_event():
    task = getattr(app.state, 'event_sync_task', None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


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
        return decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')


@app.post('/class_schedule', response_model=ClassScheduleOut)
async def add_class_schedule(data: ClassScheduleIn, payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    doc = data.dict()
    doc['owner_id'] = user_id
    try:
        if 'dates' in doc and isinstance(doc['dates'], list):
            doc['dates'] = [d.isoformat() if hasattr(d, 'isoformat') else d for d in doc['dates']]
    except Exception:
        pass
    res = await class_schedule.insert_one(doc)
    return ClassScheduleOut(id=str(res.inserted_id), **doc)


@app.get('/class_schedule', response_model=List[ClassScheduleOut])
async def get_class_schedules(payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    docs = await class_schedule.find({'owner_id': user_id}).to_list(length=100)
    return [
        ClassScheduleOut(
            id=str(doc['_id']),
            owner_id=doc.get('owner_id'),
            course=doc['course'],
            name=doc['name'],
            days=doc['days'],
            time=doc['time'],
            dates=doc['dates'],
        )
        for doc in docs
    ]


@app.delete('/class_schedule/{id}')
async def delete_class_schedule(id: str, payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    try:
        res = await class_schedule.delete_one({'_id': ObjectId(id), 'owner_id': user_id})
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid id')
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Not found or not owner')
    return JSONResponse(status_code=200, content={'detail': 'deleted'})


@app.patch('/class_schedule/{id}', response_model=ClassScheduleOut)
async def update_class_schedule(id: str, data: ClassScheduleIn, payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid id')

    doc = data.dict()
    try:
        if 'dates' in doc and isinstance(doc['dates'], list):
            doc['dates'] = [d.isoformat() if hasattr(d, 'isoformat') else d for d in doc['dates']]
    except Exception:
        pass

    res = await class_schedule.update_one({'_id': obj_id, 'owner_id': user_id}, {'$set': doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Not found or not owner')

    new_doc = await class_schedule.find_one({'_id': obj_id})
    return ClassScheduleOut(
        id=str(new_doc.get('_id')),
        owner_id=new_doc.get('owner_id'),
        course=new_doc.get('course'),
        name=new_doc.get('name'),
        days=new_doc.get('days'),
        time=new_doc.get('time'),
        dates=new_doc.get('dates'),
    )


class UpdateProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None


@app.post('/signup', response_model=UserOut)
async def signup(user: UserIn):
    existing = await users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    try:
        hashed = hash_password(user.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Password hashing failed: {e}')
    doc = {'name': user.name, 'email': user.email, 'hashed_password': hashed}
    res = await users.insert_one(doc)
    return UserOut(id=str(res.inserted_id), name=user.name, email=user.email)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={'detail': exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logging.getLogger('uvicorn.error').exception('Unhandled exception')
    return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={'detail': 'Invalid request data'})


@app.post('/login')
async def login(form_data: LoginIn, response: Response):
    user = await users.find_one({'email': form_data.email})
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    try:
        ok = verify_password(form_data.password, user.get('hashed_password'))
    except Exception:
        raise HTTPException(status_code=500, detail='Error during password verification')
    if not ok:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = create_access_token({'sub': str(user.get('_id')), 'email': user.get('email')})
    response.set_cookie(
        key='access_token',
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        domain=COOKIE_DOMAIN,
        max_age=60 * 60,
    )
    return {'detail': 'login successful'}


@app.post('/logout')
async def logout(response: Response):
    response.delete_cookie(key='access_token', domain=COOKIE_DOMAIN)
    response.set_cookie(
        key='access_token',
        value='',
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        domain=COOKIE_DOMAIN,
        max_age=0,
    )
    return {'detail': 'logged out'}


@app.get('/health')
async def health():
    return {
        'status': 'ok',
        'eventSyncEnabled': EVENT_SYNC_ENABLED,
        'corsOrigins': CORS_ORIGINS,
    }


@app.get('/me')
async def me(payload: dict = Depends(get_current_user)):
    user_id = payload.get('sub')
    user = await users.find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {'id': str(user.get('_id')), 'name': user.get('name'), 'email': user.get('email'), 'phone': user.get('phone')}


@app.patch('/me')
async def update_me(data: UpdateProfile, payload: dict = Depends(get_current_user)):
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

    if data.newPassword is not None or data.currentPassword is not None:
        if not data.currentPassword or not data.newPassword:
            raise HTTPException(status_code=400, detail='Both currentPassword and newPassword are required to change password')
        try:
            ok = verify_password(data.currentPassword, user.get('hashed_password'))
        except Exception:
            raise HTTPException(status_code=500, detail='Error verifying password')
        if not ok:
            raise HTTPException(status_code=401, detail='Current password incorrect')
        try:
            updates['hashed_password'] = hash_password(data.newPassword)
        except Exception:
            raise HTTPException(status_code=500, detail='Failed to hash new password')

    if updates:
        await users.update_one({'_id': ObjectId(user_id)}, {'$set': updates})

    new_user = await users.find_one({'_id': ObjectId(user_id)})
    return {'id': str(new_user.get('_id')), 'name': new_user.get('name'), 'email': new_user.get('email'), 'phone': new_user.get('phone')}


@app.get('/route')
async def get_route(oLat: float, oLng: float, dLat: float, dLng: float, mode: str = 'driving'):
    if not OPENROUTESERVICE_API_KEY:
        raise HTTPException(status_code=500, detail='OpenRouteService API key not configured. Set OPENROUTESERVICE_API_KEY in .env')

    profile_map = {
        'driving': 'driving-car',
        'walking': 'foot-walking',
        'bicycling': 'cycling-regular',
    }
    if mode == 'transit':
        raise HTTPException(status_code=400, detail='Transit mode is not supported by OpenRouteService')
    profile = profile_map.get(mode)
    if not profile:
        raise HTTPException(status_code=400, detail=f'Invalid mode. Must be one of: {", ".join(profile_map.keys())}')

    try:
        if not (-90 <= oLat <= 90 and -180 <= oLng <= 180):
            raise HTTPException(status_code=400, detail='Invalid origin coordinates')
        if not (-90 <= dLat <= 90 and -180 <= dLng <= 180):
            raise HTTPException(status_code=400, detail='Invalid destination coordinates')

        response = requests.post(
            f'{OPENROUTESERVICE_BASE_URL}/v2/directions/{profile}/geojson',
            headers={'Authorization': OPENROUTESERVICE_API_KEY, 'Content-Type': 'application/json'},
            json={'coordinates': [[oLng, oLat], [dLng, dLat]], 'instructions': False},
            timeout=20,
        )
        if response.status_code in (401, 403):
            raise HTTPException(status_code=500, detail='OpenRouteService request was denied. Check the API key and project limits.')
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail='OpenRouteService rate limit exceeded. Please try again in a moment.')
        if not response.ok:
            try:
                payload = response.json()
                detail = payload.get('error') or payload.get('message') or str(payload)
            except Exception:
                detail = response.text or f'HTTP {response.status_code}'
            raise HTTPException(status_code=500, detail=f'OpenRouteService API error: {detail}')

        route_result = response.json()
        features = route_result.get('features') or []
        if not features:
            raise HTTPException(status_code=404, detail='No route found between origin and destination')

        geometry = (features[0].get('geometry') or {}).get('coordinates') or []
        if not geometry:
            raise HTTPException(status_code=404, detail='Route geometry was not returned by OpenRouteService')

        coordinates = [[lat, lng] for lng, lat in geometry]
        return {'coordinates': coordinates}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error computing route: {str(e)}')


@app.get('/events')
async def get_events(
    limit: int = 6,
    when: Optional[str] = None,
    q: Optional[str] = None,
    category: Optional[str] = None,
    organization: Optional[str] = None,
    location: Optional[str] = None,
):
    try:
        events_col = get_events_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Events collection not available')

    now = datetime.now(timezone.utc)

    try:
        if await events_col.count_documents({}, limit=1) == 0:
            await asyncio.to_thread(sync_events)
    except Exception:
        logger.exception('Initial event sync attempt failed.')

    if when and when.lower() == 'today':
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        query = {
            '$or': [
                {
                    '$and': [
                        {'startsOn_dt': {'$lte': day_end}},
                        {'$or': [{'endsOn_dt': {'$gte': day_start}}, {'endsOn_dt': {'$exists': False}}]},
                    ]
                },
                {
                    '$and': [
                        {'startsOn': {'$lte': day_end.isoformat()}},
                        {'$or': [{'endsOn': {'$gte': day_start.isoformat()}}, {'endsOn': {'$exists': False}}]},
                    ]
                },
            ]
        }
    else:
        query = {'$or': [{'endsOn_dt': {'$gte': now}}, {'endsOn': {'$gte': now.isoformat()}}]}

    extra_filters = []
    if q and q.strip():
        safe_q = q.strip()
        extra_filters.append(
            {
                '$or': [
                    {'title': {'$regex': safe_q, '$options': 'i'}},
                    {'description': {'$regex': safe_q, '$options': 'i'}},
                    {'location': {'$regex': safe_q, '$options': 'i'}},
                    {'organizationNames': {'$regex': safe_q, '$options': 'i'}},
                ]
            }
        )
    if category and category.strip():
        extra_filters.append(
            {
                '$or': [
                    {'theme': {'$regex': category.strip(), '$options': 'i'}},
                    {'categoryNames': {'$regex': category.strip(), '$options': 'i'}},
                    {'benefitNames': {'$regex': category.strip(), '$options': 'i'}},
                ]
            }
        )
    if organization and organization.strip():
        extra_filters.append({'organizationNames': {'$regex': organization.strip(), '$options': 'i'}})
    if location and location.strip():
        extra_filters.append(
            {
                '$or': [
                    {'location': {'$regex': location.strip(), '$options': 'i'}},
                    {'shortLocation': {'$regex': location.strip(), '$options': 'i'}},
                ]
            }
        )
    if extra_filters:
        query = {'$and': [query, *extra_filters]}

    docs = await events_col.find(query).sort([('startsOn_dt', 1), ('endsOn', 1)]).to_list(length=limit)

    if not docs:
        try:
            await asyncio.to_thread(sync_events)
            docs = await events_col.find(query).sort([('startsOn_dt', 1), ('endsOn', 1)]).to_list(length=limit)
        except Exception:
            logger.exception('Self-heal event sync failed.')

    out = []
    for d in docs:
        doc = dict(d)
        try:
            doc['id'] = str(doc.get('_id'))
        except Exception:
            doc['id'] = doc.get('_id')
        doc.pop('_id', None)
        if isinstance(doc.get('startsOn_dt'), datetime):
            doc['startsOn_dt'] = doc['startsOn_dt'].astimezone(timezone.utc).isoformat()
        if isinstance(doc.get('endsOn_dt'), datetime):
            doc['endsOn_dt'] = doc['endsOn_dt'].astimezone(timezone.utc).isoformat()
        out.append(doc)
    return out


@app.post('/events/sync')
async def sync_events_from_engage():
    try:
        result = sync_events()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to sync Engage events: {str(e)}')
    return {'detail': 'Events synced successfully', **result}


@app.get('/events/{event_id}/is_registered')
async def is_registered(event_id: str, payload: dict = Depends(get_current_user)):
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
    try:
        regs = get_registrations_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Registrations collection not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    existing = await regs.find_one({'event_id': event_id, 'user_id': user_id})
    if existing:
        return {'registered': True, 'id': str(existing.get('_id'))}

    event_snapshot = None
    try:
        events_col = get_events_collection()
    except Exception:
        events_col = None

    if events_col is not None:
        try:
            if ObjectId.is_valid(event_id):
                ed = await events_col.find_one({'_id': ObjectId(event_id)})
            else:
                ed = await events_col.find_one({'id': event_id}) or await events_col.find_one({'source_id': event_id})
        except Exception:
            ed = None
        if ed:
            try:
                ed['id'] = str(ed.get('_id'))
            except Exception:
                ed['id'] = ed.get('_id')
            ed.pop('_id', None)
            org_names = []
            try:
                if ed.get('organizationNames') and isinstance(ed.get('organizationNames'), list):
                    org_names = [str(x) for x in ed.get('organizationNames') if x]
                elif ed.get('organizationNames') and isinstance(ed.get('organizationNames'), str):
                    org_names = [ed.get('organizationNames')]
                elif ed.get('organizations') and isinstance(ed.get('organizations'), list):
                    for o in ed.get('organizations'):
                        if not o:
                            continue
                        if isinstance(o, str):
                            org_names.append(o)
                        elif isinstance(o, dict):
                            org_names.append(o.get('name') or o.get('title') or o.get('displayName') or str(o))
                elif (ed.get('properties') or {}).get('source_name'):
                    org_names = [str((ed.get('properties') or {}).get('source_name'))]
            except Exception:
                org_names = []
            event_snapshot = {
                'id': ed.get('id'),
                'title': ed.get('title') or ed.get('name') or (ed.get('properties') or {}).get('name'),
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
    try:
        regs = get_registrations_collection()
        events_col = get_events_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Collections not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    query = {'$or': [{'user_id': user_id}]}
    try:
        if ObjectId.is_valid(user_id):
            query['$or'].append({'user_id': ObjectId(user_id)})
    except Exception:
        pass

    reg_docs = await regs.find(query).sort('created_at', -1).to_list(length=limit)

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
                if not event_doc:
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


@app.delete('/registrations/{registration_id}')
async def delete_registration(registration_id: str, payload: dict = Depends(get_current_user)):
    try:
        regs = get_registrations_collection()
    except Exception:
        raise HTTPException(status_code=500, detail='Registrations collection not available')

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Missing user id')

    try:
        oid = ObjectId(registration_id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid registration id')

    res = await regs.delete_one({'_id': oid, 'user_id': user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Registration not found or not owned by user')
    return {'deleted': True}
