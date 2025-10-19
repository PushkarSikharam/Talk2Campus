from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserIn(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr

class UserInDB(BaseModel):
    name: str
    email: EmailStr
    hashed_password: str
