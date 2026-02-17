
from re import L
import json, uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, websockets
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session
import time


def TouchRoom(room_id):
    db = next(get_db())
    try:
        record = db.query(room_info).filter(room_info.token==room_id).first()
        # print(room_id,'?')
        if record:
            # print('updating last activity for room', room_id, record.token)
            record.lastActivity = int(time.time())
            db.commit()
            return True
    finally:
        db.close()