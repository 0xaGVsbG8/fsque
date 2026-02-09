from app_independencies import Request, PREFIX
# from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter, Depends
import os, shutil
import pandas as pd
from typing import List
from pydantic import BaseModel
from typing import Literal
from db_conn import get_db
from views.models import room_info

router = APIRouter()




@router.get('/read_rooms')
async def view(request: Request, db: Session = Depends(get_db), bg_tasks: BackgroundTasks = None):
    
    # result = db_conn.read_rooms(js_visable=True)
    result = db.query(room_info).filter(room_info.visible==True).all()
    # print([row.privacy.value for row in result])
    filtered = [{'name': row.name, 'protected': True if row.privacy.value == 'private' else False, 'visible': True,'owner': row.owner, 'room_id': row.token} for row in result]
    return {'rooms': filtered}
    
    ...
    