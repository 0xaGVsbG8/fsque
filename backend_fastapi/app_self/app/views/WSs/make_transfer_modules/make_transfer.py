
import json
from sys import exception
import time
from modules.touchRoomRecord import TouchRoom
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import true
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
# from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session
from ..set_connection import SINGLE_FILE_TRANSFER_ROOMS
import asyncio
from .utils import erase_conn_room, Relay

router = APIRouter()
MAX_HANDSHAKE_ATTEMPTS = 10 # every second so for instance 10 attempts equals 10 seconds
ROOM_TOUCH_INTERVAL = 10 #how often update room last activity

WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING = True




            


async def hook_peer_handshake(
    ws: WebSocket,
    THIS_ROOM_DATA: dict,
    TRANSFER_ACCESS_TOKEN: str
):
    HANDSHAKE_ATTEMPTS = 0
    
    while True:
        try:
            
            if HANDSHAKE_ATTEMPTS >= MAX_HANDSHAKE_ATTEMPTS:
                print('Max handshake attempts has been reached, closing connection')
                await ws.close()
                erase_conn_room(TRANSFER_ACCESS_TOKEN)
                raise SystemExit('Max handshake attempts has been reached, closing connection')
                # return
            
            CLIENT_WS = THIS_ROOM_DATA.get("CLIENT_WS")
            HOST_WS = THIS_ROOM_DATA.get("HOST_WS")
            
            if CLIENT_WS is None or HOST_WS is None:
                print('one of users didnt connect!')
                await asyncio.sleep(1)
                HANDSHAKE_ATTEMPTS += 1
            else:
                print('Handshake confirmed')
                return CLIENT_WS, HOST_WS
                
        except Exception as e:
            print(e, '\n\n\nerr in handshake')    
            break
    ...



@router.websocket("/make-transfer")
async def websocket_endpoint(ws: WebSocket):
    
    TRANSFER_ACCESS_TOKEN = str(ws.query_params.get("TRANSFER_ACCESS_TOKEN"))
    USER_ID = ws.cookies.get("user_id")
    USERNAME = ws.cookies.get("username")
    
    if SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN):
        THIS_ROOM_DATA = SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN]
        
        if USER_ID == THIS_ROOM_DATA['HOST'] or USER_ID == THIS_ROOM_DATA['client']:
            print('user allowed!')
            ROLE = 'HOST' if USER_ID == THIS_ROOM_DATA['HOST'] else 'client'
            THIS_ROOM_DATA['received_chunk'] = True

            THIS_ROOM_DATA['HOST_WS' if ROLE == 'HOST' else 'CLIENT_WS'] = ws
            
            
            await ws.accept()
            

            CLIENT_WS, HOST_WS = await hook_peer_handshake(
                ws,
                THIS_ROOM_DATA,
                TRANSFER_ACCESS_TOKEN
            )
            
            TOTAL_FILESIZE = THIS_ROOM_DATA['filesize']
            
            THIS_ROOM_DATA['chunk_event'] = asyncio.Event()
            THIS_ROOM_DATA['OFFSET'] = 0
            
            FILE_ID_ASSIGNED_BY_USER = THIS_ROOM_DATA['file_id']
            
            ROOM_ID = THIS_ROOM_DATA['room_id']
            
            await Relay(
                ROLE,
                ws,
                THIS_ROOM_DATA,
                TOTAL_FILESIZE,
                FILE_ID_ASSIGNED_BY_USER,
                ROOM_ID,
                CLIENT_WS,
                HOST_WS,
                TRANSFER_ACCESS_TOKEN
            ).start()
                    # ...
                
                #waiting for client to be ready
                
             