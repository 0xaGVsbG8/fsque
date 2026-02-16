
from fastapi import WebSocket, WebSocketDisconnect
from modules.touchRoomRecord import TouchRoom
import time, json, asyncio
from ..set_connection import MULTIPLE_FILE_TRANSFER_ROOMS


WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING = True
MAX_HANDSHAKE_ATTEMPTS = 10
ROOM_TOUCH_INTERVAL = 10


def erase_conn_room(TRANSFER_ACCESS_TOKEN):
    if MULTIPLE_FILE_TRANSFER_ROOMS.get(TRANSFER_ACCESS_TOKEN):
        del MULTIPLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN]


class MultiRelay:
    def __init__(
        self,
        ROLE: str,
        ws: WebSocket,
        THIS_ROOM_DATA: dict,
        ROOM_ID: str,
        CLIENT_WS: WebSocket,
        HOST_WS: WebSocket,
        TRANSFER_ACCESS_TOKEN: str,
        FILES_ID: list
    ):
        self.ROLE = ROLE
        self.ws = ws
        self.THIS_ROOM_DATA = THIS_ROOM_DATA
        self.ROOM_ID = ROOM_ID
        self.CLIENT_WS = CLIENT_WS
        self.HOST_WS = HOST_WS
        self.TRANSFER_ACCESS_TOKEN = TRANSFER_ACCESS_TOKEN
        self.FILES_ID = FILES_ID

    async def start(self):
        if self.ROLE == 'client':
            await self.client()
        elif self.ROLE == 'HOST':
            await self.host()


    async def client(self):
        PERC = '0.00'
        while True:
            try:
                client_response = await self.CLIENT_WS.receive_json()
                client_response: dict

                if client_response.get('ready_for_transfer'):
                    print('client ready for multiple transfer')
                    self.THIS_ROOM_DATA['client_ready'] = True
                    
                if client_response.get('file_saved'):
                    self.THIS_ROOM_DATA['USER_SAVED_FILE'].set()
                    print('Client saved file')
                    

                if client_response.get('received_chunk'):
                    self.THIS_ROOM_DATA['chunk_event'].set()

                    TOTAL_FILESIZE = self.THIS_ROOM_DATA.get('current_filesize', 1)
                    PERC = round(((self.THIS_ROOM_DATA['OFFSET'] / TOTAL_FILESIZE) * 100), 2)
                    CURRENT_FILE_ID = self.THIS_ROOM_DATA.get('current_file_id', '')

                    await self.CLIENT_WS.send_json({
                        'upload_progress': PERC,
                        'for_file': CURRENT_FILE_ID,
                        'file_index': self.THIS_ROOM_DATA.get('current_file_index', 0),
                        'total_files': self.THIS_ROOM_DATA.get('total_files', 0)
                    })

                    if WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING:
                        try:
                            await self.HOST_WS.send_json({'chunk_received': True})
                        except (RuntimeError, Exception):
                            print('host disconnected mid-multi-transfer, notifying client')
                            try:
                                await self.CLIENT_WS.send_json({'transfer_canceled_by': 'host'})
                            except Exception:
                                ...
                            break

            except (WebSocketDisconnect, RuntimeError):
                if '100' not in str(PERC):
                    print('client disconnected before multi-download finished')
                    try:
                        await self.HOST_WS.send_json({'transfer_canceled_by': 'client'})
                    except Exception:
                        print('host already closed')
                break


    async def host(self):
        LAST_TOUCH = time.time()
        PERC = '0.00'

        # Wait for client to be ready
        while not self.THIS_ROOM_DATA.get('client_ready'):
            await asyncio.sleep(1)

        TOTAL_FILES = len(self.FILES_ID)

        try:
            for file_index, file_id in enumerate(self.FILES_ID, start=1):
                print(f'Starting multi-transfer for file: {file_id} ({file_index}/{TOTAL_FILES})')

                # Reset per-file state
                self.THIS_ROOM_DATA['OFFSET'] = 0
                self.THIS_ROOM_DATA['chunk_event'] = asyncio.Event()
                self.THIS_ROOM_DATA['USER_SAVED_FILE'] = asyncio.Event()
                self.THIS_ROOM_DATA['current_file_id'] = file_id
                self.THIS_ROOM_DATA['current_filesize'] = 1  # will be updated by host
                self.THIS_ROOM_DATA['current_file_index'] = file_index
                self.THIS_ROOM_DATA['total_files'] = TOTAL_FILES
                PERC = '0.00'

                # Tell HOST to begin uploading this file
                await self.HOST_WS.send_json({
                    'begin_upload': True,
                    'file_id': file_id,
                    'file_index': file_index,
                    'total_files': TOTAL_FILES,
                    'client_username': self.THIS_ROOM_DATA['client_username']
                })

                # Tell CLIENT which file is starting
                await self.CLIENT_WS.send_json({
                    'begin_file': file_id,
                    'file_index': file_index,
                    'total_files': TOTAL_FILES
                })

                # Relay chunks for this file
                file_done = False
                while not file_done:
                    if time.time() - LAST_TOUCH >= ROOM_TOUCH_INTERVAL:
                        TouchRoom(self.ROOM_ID)
                        LAST_TOUCH = time.time()

                    msg = await self.HOST_WS.receive()

                    if 'text' in msg:
                        msg_data = json.loads(msg['text'])
                        print(msg_data, 'multi-relay')

                        if msg_data.get('file_info'):
                            self.THIS_ROOM_DATA['current_filesize'] = msg_data['file_info']['filesize']
                            continue

                        if msg_data.get('file_transfer_complete'):
                            print(f'File {file_id} transfer complete')
                            PERC = '100.00'
                            await self.CLIENT_WS.send_json({'upload_progress': PERC, 'for_file': file_id, 'file_index': file_index, 'total_files': TOTAL_FILES})
                            await self.CLIENT_WS.send_json({'file_complete': True, 'file_id': file_id})
                            file_done = True
                            print('HOST IS WAITING FOR USER TO SAVE A FILE')
                            await self.THIS_ROOM_DATA['USER_SAVED_FILE'].wait()
                            self.THIS_ROOM_DATA['USER_SAVED_FILE'].clear()
                            print('HOST RECEIVED THAT USER SAVED A FILE')
                            # await asyncio.sleep(5)
                            continue

                        if msg_data.get('transfer_canceled'):
                            print('Host canceled multi-transfer')
                            await self.CLIENT_WS.send_json({'transfer_canceled_by': 'HOST'})
                            erase_conn_room(self.TRANSFER_ACCESS_TOKEN)
                            return

                    if 'bytes' in msg:
                        chunk = msg['bytes']
                        print('received chunk (multi)')
                        await self.CLIENT_WS.send_bytes(chunk)
                        self.THIS_ROOM_DATA['OFFSET'] += len(chunk)

                        if WAIT_FOR_CLIENT_RESPONSE_WHILE_UPLOADING:
                            await self.THIS_ROOM_DATA['chunk_event'].wait()
                            self.THIS_ROOM_DATA['chunk_event'].clear()

            # All files done
            print('All files transferred!')
            await self.CLIENT_WS.send_json({'all_transfers_complete': True})
            await self.HOST_WS.send_json({'all_uploads_complete': True})

            try:
                await asyncio.sleep(5)
                await self.CLIENT_WS.close()
            except Exception:
                ...

            erase_conn_room(self.TRANSFER_ACCESS_TOKEN)

        except (WebSocketDisconnect, RuntimeError):
            print('host disconnected during multi-transfer')
            if '100' not in str(PERC):
                try:
                    await self.CLIENT_WS.send_json({'transfer_canceled_by': 'host'})
                except Exception:
                    print('client already closed')
