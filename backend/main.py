from typing import List, Optional
import os
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request, Response, Cookie
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from bson.objectid import ObjectId

from .db import get_users_collection, get_class_schedule_collection
from .models import UserIn, UserOut, UserInDB, LoginIn, ClassScheduleIn, ClassScheduleOut
from .auth import hash_password, verify_password, create_access_token, decode_access_token

load_dotenv()

app = FastAPI(title='Talk2Campus Backend')

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


@app.patch('/class_schedule/{id}', response_model=ClassScheduleOut)
async def update_class_schedule(id: str, data: ClassScheduleIn, payload: dict = Depends(get_current_user)):
    """Update a class schedule owned by the current user."""
    user_id = payload.get('sub')
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid id')

    # prepare update document: convert dates to ISO strings if present
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
    return ClassScheduleOut(id=str(new_doc.get('_id')),
                             owner_id=new_doc.get('owner_id'),
                             course=new_doc.get('course'),
                             name=new_doc.get('name'),
                             days=new_doc.get('days'),
                             time=new_doc.get('time'),
                             dates=new_doc.get('dates'))

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
