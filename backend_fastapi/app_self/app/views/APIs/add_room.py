from app_independencies import Request, PREFIX
# from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter, Depends
from db_conn import get_db
import os, shutil
import pandas as pd
from typing import List
from pydantic import BaseModel
from typing import Literal, Optional
import uuid
from .verify_room import STASHED_ROOMS
from views.models import room_info
from views.WSs.rooms_lobby import broadcast_rooms

router = APIRouter()

class make_room_props(BaseModel):
    name: str
    passwd: str
    privacy: Literal['public','private']
    visible: bool
    owner: str


@router.post('/make_room/')
async def view(request: Request, userdata: make_room_props, db: Session = Depends(get_db),  bg_tasks: BackgroundTasks = None):
    
    USER_ID = request.state.user_id
    
    print(USER_ID, 'userek?')
    
    # userdata.room_id = str(uuid.uuid4())
    room_token = str(uuid.uuid4())
    
    new_room = room_info(
        name = userdata.name,
        owner = userdata.owner,
        password = userdata.passwd,
        visible = userdata.visible,
        privacy=userdata.privacy,
        allowed_users=[USER_ID],
    )
    
    db.add(new_room)
    
    db.commit()
    room_token = str(new_room.token)
    # db_conn.add_room(userdata.name,userdata.passwd,userdata.privacy,userdata.visible, userdata.owner, room_token)
    STASHED_ROOMS[room_token] = []
    # db_conn.create_default_record_in_stashed_rooms(room_token)
    await broadcast_rooms()
    return {'room_token': room_token}
    # db_conn.add_room(**userdata.dict())
    
    ...
    