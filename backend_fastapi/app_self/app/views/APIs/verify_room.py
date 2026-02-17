from sqlalchemy import false, and_, func
from app_independencies import Request, PREFIX
# from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter, Depends
from db_conn import get_db
from views.models import room_info
import os, shutil, uuid
import pandas as pd
from typing import List, Dict
from pydantic import BaseModel
from typing import Literal
import json


router = APIRouter()

STASHED_ROOMS: [Dict[str, int]] = {}
ACCESS_TOKENS = set()



@router.get('/does_room_exists/')
async def view(request: Request, received_room_id:str = Query(...),db: Session = Depends(get_db), bg_tasks: BackgroundTasks = None):
    ...
    USER_ID = request.state.user_id
    FOUND_ROOM = False
    
    result = db.query(room_info).filter(room_info.visible).all()
    for record in result:
        room_id = record.token
        if received_room_id == room_id:
            room_data = record
            print('Room found')
            FOUND_ROOM = True
            break
    
    if not FOUND_ROOM:
        return {'room_found': False}
    
    ROOM_PROTECTED = True if room_data.privacy.value == 'private' else False
    ALLOW_USER = False

    if ROOM_PROTECTED:
        result = db.query(room_info).filter(and_(
                room_info.token == room_id, 
                func.JSON_CONTAINS(
                    room_info.allowed_users,
                    json.dumps(str(USER_ID))
                )
        )).first()
        if result:
            print('user allowed')
            ALLOW_USER = True
    else:
        ALLOW_USER = True
        

    return {
        'room_found': True,
        'ROOM_PROTECTED': ROOM_PROTECTED,
        'ALLOW_USER': ALLOW_USER,
    }
    
    ...
    
    
    
    
    
class ROOM_CREDS_PROPS(BaseModel):
    received_room_id: str
    received_passwd: str
    

@router.post('/check_room_password/')
async def view(request: Request, userdata: ROOM_CREDS_PROPS,db: Session = Depends(get_db), bg_tasks: BackgroundTasks = None):
    
    USER_ID = request.state.user_id
    FOUND_ROOM = False
    print(USER_ID,'??')
    
    result = db.query(room_info).filter(room_info.token==userdata.received_room_id).first()
    if result:
        
        room_passwd = result.password
        print(room_passwd)
        if room_passwd == userdata.received_passwd:
            print('correct passwd for this room')
            altered_allowed_users = set(result.allowed_users.copy())
            altered_allowed_users.add(USER_ID)
            result.allowed_users = list(altered_allowed_users)
            db.commit()
            return {'refresh': True}
        
        else:
            print('password incorrect')
        
  
    else:
        return {'room_found': False}
    
    ...