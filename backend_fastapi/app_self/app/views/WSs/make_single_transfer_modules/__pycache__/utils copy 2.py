

from fastapi import WebSocket, WebSocketDisconnect
from modules.touchRoomRecord import TouchRoom
import time, json, asyncio
from ..set_connection import SINGLE_FILE_TRANSFER_ROOMS


WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING  = True
MAX_HANDSHAKE_ATTEMPTS = 10 # every second so for instance 10 attempts equals 10 seconds
ROOM_TOUCH_INTERVAL = 10 #how often update room last activity


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
                if client_response.get('received_chunk'):
                    self.THIS_ROOM_DATA['chunk_event'].set()

                    PERC = round(((self.THIS_ROOM_DATA['OFFSET'] / self.TOTAL_FILESIZE) * 100), 2)

                    await self.CLIENT_WS.send_json({'upload_progress': PERC, 'for_file': self.FILE_ID_ASSIGNED_BY_USER})
                    await self.HOST_WS.send_json({'chunk_received':True}) if WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING else None
            
            except (WebSocketDisconnect, RuntimeError) as e:
                if '100' not in str(PERC):
                    print('client is disconnecting before download is done!')
                    try:
                        await self.HOST_WS.send_json({'transfer_canceled_by':'client'})
                        # await self.HOST_WS.close()
                    except Exception as e:
                        print('host already closed')
                        ...
                    
                break
            
            
            
            
    async def host(self):
        HOST_NOTIFIED = False
        chunk_counter = 0
        LAST_TOUCH = time.time()
        PERC = '0.00'

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
                                # await self.HOST_WS.close()
                                # await self.CLIENT_WS.close()
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
                    # print('client didnt connect yet')
                    await asyncio.sleep(1) 

            except (WebSocketDisconnect, RuntimeError) as e:
                
                print('host is down')
                
                if '100' not in str(PERC):
                    print('host is disconnecting before upload is done!')
                    try:
                        await self.CLIENT_WS.send_json({'transfer_canceled_by':'host'})
                #         await self.CLIENT_WS.close()
                    except Exception as e:
                        print('client already closed', e)
                #         ...
                    
                break