
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, JSON, Float, null, BigInteger
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import declarative_base
from datetime import datetime
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy import ARRAY, String
import uuid
import time
import enum
from sqlalchemy.ext.mutable import MutableList


Base = declarative_base()


class RoomPrivacyEnum(enum.Enum):
    public = "public"
    private = "private"


class room_info(Base):
    __tablename__ = "rooms_info"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    owner = Column(String, nullable=False)

    privacy = Column(
        Enum(RoomPrivacyEnum),
        default=RoomPrivacyEnum.public,
        nullable=False
    )

    password = Column(String, nullable=True)
    visible = Column(Boolean, default=True, nullable=False)
    
    
    allowed_users = Column(
        MutableList.as_mutable(JSON),
        nullable=False
    )
    

    token = Column(
        String(36),
        default=lambda: str(uuid.uuid4()),
        unique=True,
        nullable=False
    )

    lastActivity = Column(BigInteger, default=lambda: int(time.time()), nullable=False)

    def __init__(
        self,
        name: str,
        owner: str,
        password: str | None = None,
        privacy: RoomPrivacyEnum = RoomPrivacyEnum.public,
        visible: bool = True,
        allowed_users: list | None = None
    ):
        self.name = name
        self.owner = owner
        self.privacy = privacy
        self.password = password     
        self.visible = visible
        self.allowed_users = allowed_users if allowed_users is not None else []