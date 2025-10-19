from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserIn(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str]

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None

class UserInDB(BaseModel):
    name: str
    email: EmailStr
    hashed_password: str
    phone: Optional[str]


class UpdateProfile(BaseModel):
    name: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    current_password: Optional[str]
    new_password: Optional[str]


class ClassScheduleItem(BaseModel):
    course: str
    name: str
    days: list[str]
    time: list[str]  # [start, end] as HH:mm strings
    dates: list[str]  # [from, to] as YYYY-MM-DD strings


class ClassScheduleOut(ClassScheduleItem):
    id: str
