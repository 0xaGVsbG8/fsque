from app_independencies import Request, PREFIX
from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter
import os, shutil
import pandas as pd
from typing import List
from pydantic import BaseModel
from typing import Literal, Optional
import uuid

router = APIRouter()

class make_room_props(BaseModel):
    name: str
    passwd: str
    privacy: Literal['public','private']
    visible: bool
    owner: str


@router.post('/make_room')
async def view(request: Request, userdata: make_room_props, bg_tasks: BackgroundTasks = None):
    # userdata.room_id = str(uuid.uuid4())
    room_token = uuid.uuid4()
    db_conn.add_room(userdata.name,userdata.passwd,userdata.privacy,userdata.visible, userdata.owner, room_token)
    return {'room_token': room_token}
    # db_conn.add_room(**userdata.dict())
    
    ...
    