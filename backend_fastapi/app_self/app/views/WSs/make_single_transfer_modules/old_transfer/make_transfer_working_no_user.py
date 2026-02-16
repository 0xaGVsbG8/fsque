
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
            
            ROOM_ID = THIS_ROOM_DATA['room_id']
            
            await ws.accept()
            
            try:
                HANDSHAKE_ATTEMPTS = 0
 
                while True:
                    try:
                        
                        if HANDSHAKE_ATTEMPTS >= MAX_HANDSHAKE_ATTEMPTS:
                            print('Max handshake attempts has been reached, closing connection')
                            await ws.close()
                            erase_conn_room(TRANSFER_ACCESS_TOKEN)
                            return
                        
                        CLIENT_WS = THIS_ROOM_DATA.get("CLIENT_WS")
                        HOST_WS = THIS_ROOM_DATA.get("HOST_WS")
                        
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
                        ...
                
                #waiting for client to be ready
                notified = False
                if ROLE == 'client':
                    while True:
                        data = await ws.receive_json()
                        if data.get('ready_for_transfer'):
                            print('client ready')
                            THIS_ROOM_DATA['client_ready'] = True
                            await asyncio.sleep(3600)
                            # break
                                
                            
                        # print(data, '??xxxx')
                        # await asyncio.sleep(3600)
                        
                        
                if ROLE == 'HOST':
                    CLIENT_WS: WebSocket
                    HOST_WS: WebSocket
                    
                    HOST_NOTIFIED = False
                    
                    chunk_counter = 0
                    LAST_TOUCH = time.time()
                    OFFSET = 0
                    TOTAL_FILESIZE = THIS_ROOM_DATA['filesize']
                    FILE_ID_ASSIGNED_BY_USER = THIS_ROOM_DATA['file_id']
                    
                    while True:
                        try:
                            if THIS_ROOM_DATA.get('client_ready'):
                                
                                if time.time() - LAST_TOUCH >= ROOM_TOUCH_INTERVAL:
                                    # print('touching room')
                                    TouchRoom(ROOM_ID)
                                    LAST_TOUCH = time.time()
                                
                                await ws.send_json({'begin_upload':True, 'file_id':FILE_ID_ASSIGNED_BY_USER, 'client_username': THIS_ROOM_DATA['client_username']}) if not HOST_NOTIFIED else None
                                HOST_NOTIFIED = True
                                
                                THIS_ROOM_DATA['received_chunk'] = False
                                
                                msg =  await ws.receive()
                                
                                if 'text' in msg:
                                    msg = json.loads(msg['text'])
                                    if msg.get('transfer_complete'):
                                        print('transfer complete!')
                                        PERC = '100.00'
                                        await CLIENT_WS.send_json({'upload_progress': PERC})
                                        await CLIENT_WS.send_json({'transfer_complete':True,'for_file':FILE_ID_ASSIGNED_BY_USER})
                                        print('client notified')
                                        
                                        try:
                                            await asyncio.sleep(5)
                                            await HOST_WS.close()
                                            await CLIENT_WS.close()
                                        except Exception as e:
                                            ...
                                            
                                        erase_conn_room(TRANSFER_ACCESS_TOKEN)
                                        return
                                    
                                    
                                if 'bytes' in msg:
                                    chunk = msg['bytes']
                                    # print('received chunk')
                                    await CLIENT_WS.send_bytes(chunk)
                                    # print('chunk sent')
                                    client_response = await CLIENT_WS.receive_json()
                                    if client_response.get('received_chunk'):
                                        # print('client received a chunk!')
                                        OFFSET += len(chunk)
                                        PERC = round(((OFFSET / TOTAL_FILESIZE) * 100), 2)
                                        print(PERC, 'of', FILE_ID_ASSIGNED_BY_USER)
                                        await CLIENT_WS.send_json({'upload_progress': PERC, 'for_file': FILE_ID_ASSIGNED_BY_USER})
                                        await HOST_WS.send_json({'chunk_received':True})
                                    
                      
                                
                                
                            else:
                                print('client didnt connect yet')
                                await asyncio.sleep(1) 
                                
                        except Exception as e:
                            print(e, '\n\nending a loop')
                            break

        
            except WebSocketDisconnect:
                print(ROLE, 'left')
                
   