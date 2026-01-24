from sqlalchemy import false
from app_independencies import Request, PREFIX
from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter
import os, shutil
import pandas as pd
from typing import List, Dict
from pydantic import BaseModel
from typing import Literal


router = APIRouter()

STASHED_ROOMS: [Dict[str, int]] = {}


@router.get('/does_room_exists')
async def view(request: Request, received_room_id:str = Query(...), bg_tasks: BackgroundTasks = None):
    
    USER_ID = request.state.user_id
    FOUND_ROOM = False
    
    result = db_conn.read_rooms(js_visable=True)
    for record in result:
        room_id = record[len(record)-1]
        if received_room_id == room_id:
            room_data = record
            print('Room found')
            FOUND_ROOM = True
            break
    
    if not FOUND_ROOM:
        return {'room_found': False}
    
    ROOM_PROTECTED = True if room_data[3] == 'private' else False
    ALLOW_USER = False

    if ROOM_PROTECTED:
        if db_conn.is_user_allowed(room_id, USER_ID):
            ALLOW_USER = True
    else:
        ALLOW_USER = True

    if ALLOW_USER:
        if not STASHED_ROOMS.get(received_room_id):
            STASHED_ROOMS[received_room_id] = [USER_ID]
        else:
            STASHED_ROOMS[received_room_id].append(USER_ID)
            STASHED_ROOMS[received_room_id] = list(set(STASHED_ROOMS[received_room_id]))
        
    return {
        'room_found': True,
        'ROOM_PROTECTED': ROOM_PROTECTED,
        'ALLOW_USER': ALLOW_USER
    }
    
    ...
    
    
    
    
    
class ROOM_CREDS_PROPS(BaseModel):
    received_room_id: str
    received_passwd: str

@router.post('/check_room_password')
async def view(request: Request, userdata: ROOM_CREDS_PROPS, bg_tasks: BackgroundTasks = None):
    
    USER_ID = request.state.user_id
    FOUND_ROOM = False
    print(USER_ID,'??')
    
    result = db_conn.read_rooms(js_visable=True)
    for record in result:
        room_id = record[len(record)-1]
        if userdata.received_room_id == room_id:
            room_data = record
            print('Room found')
            FOUND_ROOM = True
            break
    
    if not FOUND_ROOM:
        return {'room_found': False}
    
    room_passwd = room_data[2]
    print(room_passwd)
    if room_passwd == userdata.received_passwd:
        print('correct passwd for this room')
        db_conn.stash_user_into_room(userdata.received_room_id, USER_ID)
        return {'refresh': True}
    
    # return {
    #     'room_found': True,
    #     'ROOM_PROTECTED': ROOM_PROTECTED,
    #     'ALLOW_USER': ALLOW_USER
    # }
    
    ...