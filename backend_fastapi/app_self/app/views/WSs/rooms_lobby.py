


from typing import final
import json, uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, websockets
from .ws_utils import count_occupancy
from modules.touchRoomRecord import TouchRoom
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session
import time, asyncio
from typing import List

router = APIRouter()
LOBBY_CONNS = []


def get_rooms():
    db = next(get_db())
    try:
        result = db.query(room_info).all()
        filtered = [{'name': row.name, 'protected': True if row.privacy.value == 'private' else False, 'visible': True,'owner': row.owner, 'room_id': row.token, 'occupancy': count_occupancy(row.token)} for row in result]
        return filtered
    finally:
        db.close()




async def broadcast_rooms():
    
    print('broadcasting rooms in lobby')
    
    for ws in LOBBY_CONNS:
        try:
            await ws.send_json({'rooms':get_rooms()})
        except Exception as e:
            # print('????xx')
            LOBBY_CONNS.remove(ws)



@router.websocket("/rooms-lobby/")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print('yolo')
    
    USER_ID = ws.cookies.get("user_id")
    if USER_ID:
        # await ws.accept()
        LOBBY_CONNS.append(ws)
        rooms = get_rooms()
        await ws.send_json({'rooms':rooms})
        while True:
            try:
                await ws.receive_json()
                # await asyncio.sleep(3600)
            except WebSocketDisconnect:
                # print('user disconnected')
                LOBBY_CONNS.remove(ws) if ws in LOBBY_CONNS else None
                return
    else:
        print('no user id') 