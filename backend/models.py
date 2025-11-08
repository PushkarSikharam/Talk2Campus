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

# Class schedule models
from typing import List
from datetime import date

class ClassScheduleIn(BaseModel):
    course: str
    name: str
    days: List[str]
    time: List[str]  # [start, end] in 'HH:mm' format
    dates: List[date]  # [start_date, end_date]

class ClassScheduleOut(ClassScheduleIn):
    id: str
    owner_id: str | None = None
