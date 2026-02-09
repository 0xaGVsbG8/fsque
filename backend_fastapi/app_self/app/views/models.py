
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import declarative_base
from datetime import datetime
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy import ARRAY, String
import uuid
import time
import enum


Base = declarative_base()


class RoomPrivacyEnum(enum.Enum):
    public = "public"
    private = "private"


class room_info(Base):
    __tablename__ = 'rooms_info'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    owner = Column(String)
    privacy = Column(Enum(RoomPrivacyEnum),default='public', nullable=False)
    password = Column(String)

    # def __init__(self, email, password, isDev, user_token = None):
    #     self.email = email
    #     self.password = password
    #     self.isDev = isDev
    #     if user_token:
    #         self.user_token = user_token
    

