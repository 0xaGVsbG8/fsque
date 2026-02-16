
import json
from sys import exception
import time
from modules.touchRoomRecord import TouchRoom
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import true
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session
from .set_connection import SINGLE_FILE_TRANSFER_ROOMS
import asyncio

router = APIRouter()
MAX_HANDSHAKE_ATTEMPTS = 10 # every second so for instance 10 attempts equals 10 seconds
ROOM_TOUCH_INTERVAL = 10 #how often update room last activity

def erase_conn_room(TRANSFER_ACCESS_TOKEN):
    if SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN):
        del SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN]




async def relay(sender: WebSocket, receiver: WebSocket):
    
    try:
        while True:
            
            #HOST behaviour
            msg = await sender.receive()
            if 'bytes' in msg:
                print('chunks received')
                chunk = msg['bytes']
                receiver.send_bytes(chunk)
                receiver_response = await receiver.receive_json()
                await sender.send_json({'chunk_received':True})
            
        ...
    
    except Exception as e:
        print(e, '\n\nerr in relay')




@router.websocket("/make-transfer")
async def websocket_endpoint(ws: WebSocket):
    
    TRANSFER_ACCESS_TOKEN = str(ws.query_params.get("TRANSFER_ACCESS_TOKEN"))
    USER_ID = ws.cookies.get("user_id")
    USERNAME = ws.cookies.get("username")
    
    if SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN):
        ROOM_DATA = SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN)
        
        if USER_ID == ROOM_DATA['HOST'] or USER_ID == ROOM_DATA['client']:
            print('user allowed!')
            ROLE = 'HOST' if USER_ID == ROOM_DATA['HOST'] else 'client'
            ROOM_DATA['received_chunk'] = True

            SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN]['HOST_WS' if ROLE == 'HOST' else 'CLIENT_WS'] = ws
            # print(SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN], '?<')
            
            ROOM_DATA = SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN)
            ROOM_ID = ROOM_DATA['room_id']
            
            await ws.accept()
            
            try:
                # CLIENT_WS = SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN].get("CLIENT_WS")
                # await CLIENT_WS.send_json({'xd':2})
                # print('sent?')
                
                HANDSHAKE_ATTEMPTS = 0
 
                while True:
                    try:
                        
                        if HANDSHAKE_ATTEMPTS >= MAX_HANDSHAKE_ATTEMPTS:
                            print('Max handshake attempts has been reached, closing connection')
                            # await CLIENT_WS.close()
                            # await HOST_WS.close()
                            await ws.close()
                            erase_conn_room(TRANSFER_ACCESS_TOKEN)
                            return
                        
                        CLIENT_WS = SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN].get("CLIENT_WS")
                        HOST_WS = SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN].get("HOST_WS")
                        
                        if CLIENT_WS is None or HOST_WS is None:
                            print('one of users didnt connect!')
                            await asyncio.sleep(1)
                            HANDSHAKE_ATTEMPTS += 1
                        else:
                            print('Handshake confirmed')
                            break
                            
                    except Exception as e:
                        # print(e)    
                        break
                    
                 
                # AFTER HANDSHAKE
                if ROLE == 'HOST':
                    await asyncio.gather(
                        relay(HOST_WS, CLIENT_WS),
                        relay(CLIENT_WS, HOST_WS)
                    )
                else:
                    await asyncio.Future()
                #waiting for client to be ready
                
              

        
            except WebSocketDisconnect:
                print(ROLE, 'left')
            

        
    ...