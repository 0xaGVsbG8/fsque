from app_independencies import Request, PREFIX
from views.WSs.set_connection import count_occupancy
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




@router.get('/do_i_have_id/')
async def view(request: Request, db: Session = Depends(get_db), bg_tasks: BackgroundTasks = None):
    return {}
    