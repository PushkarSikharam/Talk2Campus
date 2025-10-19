import os
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request, Response, Cookie
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from bson.objectid import ObjectId

from .db import get_users_collection
from .models import UserIn, UserOut, UserInDB, LoginIn
from .auth import hash_password, verify_password, create_access_token, decode_access_token
from .models import UpdateProfile
from .models import ClassScheduleItem, ClassScheduleOut
from .db import get_class_schedule_collection
from bson import ObjectId as BsonObjectId

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

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"

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
    doc = {"name": user.name, "email": user.email, "hashed_password": hashed, "phone": getattr(user, 'phone', None)}
    res = await users.insert_one(doc)
    return UserOut(id=str(res.inserted_id), name=user.name, email=user.email, phone=getattr(user, 'phone', None))


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
    # sanitize user document: remove sensitive fields and convert _id
    sanitized = {k: v for k, v in user.items() if k != 'hashed_password'}
    # convert ObjectId to string id and remove original _id
    sanitized['id'] = str(sanitized.pop('_id'))
    return sanitized

@app.put("/me", response_model=UserOut)
async def update_me(payload: UpdateProfile, current_user: dict = Depends(get_current_user)):
    """Update the current user's profile. Supports name, email and password change.

    For password change, `current_password` must be provided and correct. `new_password` will be hashed.
    """
    users = get_users_collection()
    update_fields = {}

    # current_user is the token payload; get the actual DB user
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    db_user = await users.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.email is not None:
        # check if another user already has this email
        existing = await users.find_one({"email": payload.email})
        if existing and str(existing.get("_id")) != str(db_user.get("_id")):
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = payload.email
    if payload.phone is not None:
        update_fields["phone"] = payload.phone

    # handle password change: ignore empty-string values
    new_pw = payload.new_password.strip() if (payload.new_password is not None and isinstance(payload.new_password, str)) else None
    curr_pw = payload.current_password.strip() if (payload.current_password is not None and isinstance(payload.current_password, str)) else None

    if new_pw:
        if not curr_pw:
            raise HTTPException(status_code=400, detail="current_password is required to change password")
        # verify current password against stored hash
        if not verify_password(curr_pw, db_user.get("hashed_password")):
            raise HTTPException(status_code=400, detail="current password is incorrect")
        update_fields["hashed_password"] = hash_password(new_pw)

    if update_fields:
        await users.update_one({"_id": db_user["_id"]}, {"$set": update_fields})

    # fetch updated user
    updated = await users.find_one({"_id": db_user["_id"]})
    return UserOut(id=str(updated["_id"]), name=updated["name"], email=updated["email"])


# --- Class schedule endpoints (stored in `classSchedule` collection) ---
@app.get('/class-schedule', response_model=list[ClassScheduleOut])
async def list_class_schedule():
    coll = get_class_schedule_collection()
    cursor = coll.find({})
    items = []
    async for d in cursor:
        item = {k: v for k, v in d.items() if k != '_id'}
        item['id'] = str(d.get('_id'))
        items.append(item)
    return items


@app.post('/class-schedule', response_model=ClassScheduleOut)
async def create_class_schedule(item: ClassScheduleItem):
    coll = get_class_schedule_collection()
    doc = item.dict()
    res = await coll.insert_one(doc)
    return ClassScheduleOut(id=str(res.inserted_id), **doc)


@app.put('/class-schedule/{item_id}', response_model=ClassScheduleOut)
async def update_class_schedule(item_id: str, item: ClassScheduleItem):
    coll = get_class_schedule_collection()
    oid = BsonObjectId(item_id)
    await coll.update_one({'_id': oid}, {'$set': item.dict()})
    updated = await coll.find_one({'_id': oid})
    doc = {k: v for k, v in updated.items() if k != '_id'}
    doc['id'] = str(updated.get('_id'))
    return doc


@app.delete('/class-schedule/{item_id}')
async def delete_class_schedule(item_id: str):
    coll = get_class_schedule_collection()
    oid = BsonObjectId(item_id)
    await coll.delete_one({'_id': oid})
    return {'detail': 'deleted'}
