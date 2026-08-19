from pydantic import BaseModel, ConfigDict
from typing import Optional


class StudentRegister(BaseModel):
    reg_number: str
    full_name: str
    password: str
    level_id: int
    semester_id: int
    # department_id is intentionally NOT here — it's derived from reg_number.


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reg_number: str
    full_name: str
    department_id: Optional[int] = None
    level_id: Optional[int] = None
    semester_id: Optional[int] = None


class AdminCreate(BaseModel):
    username: str
    full_name: str
    password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str


class LoginRequest(BaseModel):
    identifier: str  # registration number for students, username for admins
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
