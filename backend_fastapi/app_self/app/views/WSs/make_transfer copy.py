
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

WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING = True


def erase_conn_room(TRANSFER_ACCESS_TOKEN):
    if SINGLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN):
        del SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN]


class Relay:
    def __init__(
        self,
        ROLE: str,
        ws: WebSocket,
        THIS_ROOM_DATA: dict,
        TOTAL_FILESIZE: int,
        FILE_ID_ASSIGNED_BY_USER: str,
        ROOM_ID: str,
        CLIENT_WS: WebSocket,
        HOST_WS: WebSocket,
        TRANSFER_ACCESS_TOKEN: str
    ):
        self.ROLE = ROLE
        self.ws = ws
        self.THIS_ROOM_DATA = THIS_ROOM_DATA
        self.TOTAL_FILESIZE = TOTAL_FILESIZE
        self.FILE_ID_ASSIGNED_BY_USER = FILE_ID_ASSIGNED_BY_USER
        self.ROOM_ID = ROOM_ID
        self.CLIENT_WS = CLIENT_WS
        self.HOST_WS = HOST_WS
        self.TRANSFER_ACCESS_TOKEN = TRANSFER_ACCESS_TOKEN

    async def start(self):
        if self.ROLE == 'client':
            await self.client()
        elif self.ROLE == 'HOST':
            await self.host()

    async def client(self):
        while True:
            try:
                client_response = await self.ws.receive_json()
                client_response: dict
                if client_response.get('ready_for_transfer'):
                    print('client ready')
                    self.THIS_ROOM_DATA['client_ready'] = True
                    # await asyncio.sleep(3600)
                    # await asyncio.Future()
                    # break
                if client_response.get('received_chunk'):
                    self.THIS_ROOM_DATA['chunk_event'].set()

                    PERC = round(((self.THIS_ROOM_DATA['OFFSET'] / self.TOTAL_FILESIZE) * 100), 2)

                    await self.CLIENT_WS.send_json({'upload_progress': PERC, 'for_file': self.FILE_ID_ASSIGNED_BY_USER})
                    await self.HOST_WS.send_json({'chunk_received':True}) if WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING else None
            
            except (WebSocketDisconnect, RuntimeError) as e:
                print('client is disconnecting!')
                raise RuntimeError
                break
                # print(data, '??xxxx')
                # await asyncio.sleep(3600)


    async def host(self):
        HOST_NOTIFIED = False
        chunk_counter = 0
        LAST_TOUCH = time.time()

        while True:
            try:
                if self.THIS_ROOM_DATA.get('client_ready'):

                    if time.time() - LAST_TOUCH >= ROOM_TOUCH_INTERVAL:
                        # print('touching room')
                        TouchRoom(self.ROOM_ID)
                        LAST_TOUCH = time.time()

                    await self.ws.send_json({'begin_upload':True, 'file_id':self.FILE_ID_ASSIGNED_BY_USER, 'client_username': self.THIS_ROOM_DATA['client_username']}) if not HOST_NOTIFIED else None
                    HOST_NOTIFIED = True

                    self.THIS_ROOM_DATA['received_chunk'] = False

                    msg = await self.ws.receive()

                    if 'text' in msg:
                        msg = json.loads(msg['text'])
                        print(msg, 'yoyo')
                        if msg.get('transfer_complete'):
                            print('transfer complete!')
                            PERC = '100.00'
                            await self.CLIENT_WS.send_json({'upload_progress': PERC})
                            await self.CLIENT_WS.send_json({'transfer_complete':True,'for_file':self.FILE_ID_ASSIGNED_BY_USER})
                            print('client notified')

                            try:
                                print('???')
                                await asyncio.sleep(5)
                                await self.HOST_WS.close()
                                await self.CLIENT_WS.close()
                            except Exception as e:
                                ...

                            erase_conn_room(self.TRANSFER_ACCESS_TOKEN)
                            return
                        
                        if msg.get('transfer_canceled'):
                            print('Host canceled transfert')
                            await self.CLIENT_WS.send_json({'transfer_canceled_by':'HOST'})
                            raise RuntimeError


                    if 'bytes' in msg:
                        chunk = msg['bytes']
                        print('received chunk')
                        await self.CLIENT_WS.send_bytes(chunk)
                        # THIS_ROOM_DATA['chunk_size'] = len(chunk)
                        self.THIS_ROOM_DATA['OFFSET'] = self.THIS_ROOM_DATA['OFFSET'] + len(chunk)
                        # print('chunk sent')
                        if WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING:
                            await self.THIS_ROOM_DATA['chunk_event'].wait()
                            self.THIS_ROOM_DATA['chunk_event'].clear()



                else:
                    print('client didnt connect yet')
                    await asyncio.sleep(1) 

            except (WebSocketDisconnect, RuntimeError) as e:
                print('host is disconnecting!')
                raise WebSocketDisconnect
                break
             
            


async def aconfirm_a_handshake(
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
                return
            
            CLIENT_WS = THIS_ROOM_DATA.get("CLIENT_WS")
            HOST_WS = THIS_ROOM_DATA.get("HOST_WS")
            
            if CLIENT_WS is None or HOST_WS is None:
                print('one of users didnt connect!')
                await asyncio.sleep(1)
                HANDSHAKE_ATTEMPTS += 1
            else:
                print('Handshake confirmed')
                return CLIENT_WS, HOST_WS
                break
                
        except Exception as e:
            # print(e)    
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
            
            ROOM_ID = THIS_ROOM_DATA['room_id']
            
            await ws.accept()
            
            try:

                CLIENT_WS, HOST_WS = await aconfirm_a_handshake(
                    ws,
                    THIS_ROOM_DATA,
                    TRANSFER_ACCESS_TOKEN
                )
                        # ...
                
                #waiting for client to be ready
                
                THIS_ROOM_DATA['CHUNK_RECEIVED'] = False
                FILE_ID_ASSIGNED_BY_USER = THIS_ROOM_DATA['file_id']
                
                OFFSET = 0
                TOTAL_FILESIZE = THIS_ROOM_DATA['filesize']
                
                THIS_ROOM_DATA['chunk_event'] = asyncio.Event()
                THIS_ROOM_DATA['OFFSET'] = 0
                
                # chunk = 5 * 1024 * 1024
                
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
            
                

        
            except Exception as e:
                
                try:
                    erase_conn_room(TRANSFER_ACCESS_TOKEN)
                    if ROLE == 'client':
                        await HOST_WS.send_json({'transfer_canceled_by': ROLE})
                        await HOST_WS.close()
                        await CLIENT_WS.close()
                        
                        
                    else:
                        print('??')
                        await CLIENT_WS.send_json({'transfer_canceled_by': ROLE})
                        await CLIENT_WS.close()
                        await HOST_WS.close()
                    
                except Exception as e:
                    # print(e)
                    ...
                    
                    
                    
                print(ROLE, 'left')
                

            finally:
                ...
                # print('yolo?',ROLE)