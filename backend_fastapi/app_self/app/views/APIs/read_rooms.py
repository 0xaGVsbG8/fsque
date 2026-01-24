from app_independencies import Request, PREFIX
from modules import db_conn
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, APIRouter
import os, shutil
import pandas as pd
from typing import List
from pydantic import BaseModel
from typing import Literal


router = APIRouter()




@router.get('/read_rooms')
async def view(request: Request, bg_tasks: BackgroundTasks = None):
    
    result = db_conn.read_rooms(js_visable=True)
    filtered = [{'name': row[1], 'protected': True if row[3] == 'private' else False, 'visible': True,'owner': row[5], 'room_id': row[7]} for row in result]
    return {'rooms': filtered}
    
    ...
    