


import json, uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, websockets
from modules.touchRoomRecord import TouchRoom
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session
import time
# from .link import link_broadcast_rooms
from .ws_utils import ROOM_CONNECTIONS, count_occupancy, USERS_PAYLOAD, store_connection, register_user_in_room, remove_connection, unregister_user_in_room
from .rooms_lobby import broadcast_rooms



router = APIRouter()



#STRUCTURE
# [access_token: {
#     target: filename
#     HOST: id
#     client:id
# }]

SINGLE_FILE_TRANSFER_ROOMS = {}
MULTIPLE_FILE_TRANSFER_ROOMS = {}



def validate_token_access(ROOM_ID: str, USER_ID: str):
    
    db = next(get_db())
    db: Session
    try:
        result = db.query(room_info).filter(room_info.token==ROOM_ID).first()
        if result:
            print('room exists!')
            if USER_ID in result.allowed_users or result.privacy.value == 'public':
                print('Token is valid')
                return True
            
        print('denying access for', ROOM_ID, result)
        return False
    
    finally:
        db.close()
        
        


#room_id: [{username: 2, user_id:2,payload:xd}]



            
async def broadcast_occupancy(room_id):
    if room_id in ROOM_CONNECTIONS:
        occupancy = count_occupancy(room_id)
        
        for key, ws in list(ROOM_CONNECTIONS[room_id].items()):
            ws: WebSocket
            try:
                await ws.send_json({'connected_users':occupancy})
            except Exception as e:
                print('connection already closed!')



async def broadcast_payloads(room_id, user_id):
    
    print('spreading updated payloads')
    
    if room_id in ROOM_CONNECTIONS:
        if USERS_PAYLOAD.get('room_' + room_id):
            
            TouchRoom(room_id)
            
            ROOM_PAYLOADS =  USERS_PAYLOAD['room_'+room_id]
            ROOM_PAYLOADS: dict
            user_ws_conn_info = []
       
            for key,values in ROOM_PAYLOADS.items():
                
                #example record: user_68684664-9e2c-4d1c-8769-e2fea132ea93 {'username': 'xd', 'payload': [2]}
                USER_ID = str(key).replace('user_','')
                USERNAME = values.get('username')
                PAYLOAD = values.get('payload')
                
                data = {
                    'username': USERNAME,
                    'user_id': USER_ID,
                    'payload': PAYLOAD,
                    'temp_identity':values.get('temp_user_id')
                    
                    
                    # 
                }
                
                user_ws_conn_info.append(data)
                
                
                
                
            for key, ws in ROOM_CONNECTIONS[room_id].items():
                ws: WebSocket    
                try:
                    await ws.send_json({
                        'users_ws_conn_info': user_ws_conn_info,
                    })    
                except Exception as e:
                    print('Connection already')
                    
                         

def update_users_payload(room_id, user_id, payload):
    
    if USERS_PAYLOAD.get('room_' + room_id):
        ROOM_DATA = USERS_PAYLOAD.get('room_' + room_id)
        if ROOM_DATA.get('user_' + user_id):
            USER_DATA = ROOM_DATA.get('user_' + user_id)
            USER_DATA['payload'] = payload
            print('USERS PAYLOAD ALTERED')
            return True
    
    return False
        







@router.websocket("/room-control/")
async def websocket_endpoint(ws: WebSocket):
    
    USER_ACCESS_TOKEN = str(ws.query_params.get("USER_ACCESS_TOKEN"))
    ROOM_ID = str(ws.query_params.get("ROOM_ID"))
    USER_ID = ws.cookies.get("user_id")
    USERNAME = ws.cookies.get("username")
    
    if USER_ACCESS_TOKEN and ROOM_ID and USER_ID and USERNAME:
        
        print(f"Connecting to room: {ROOM_ID} ")
        if validate_token_access(ROOM_ID, USER_ID):
            await ws.accept()
            temp_user_id = str(uuid.uuid4())
            store_connection(ROOM_ID,USER_ID, ws)
            register_user_in_room(ROOM_ID,USERNAME, USER_ID, temp_user_id)
            
            await broadcast_rooms()
            
            
            await ws.send_json({'temp_user_id': temp_user_id})
            await broadcast_occupancy(ROOM_ID)
            await broadcast_payloads(ROOM_ID, USER_ID)
            
            
            try:
                while True:
                    data = await ws.receive_text()
                    try:
                        data = json.loads(data)
                        print(data)
                        if data.get('users_payload'):
                            print(f'received payload from user: {USERNAME} --- AND with an id of: {USER_ID}')
                            if update_users_payload(ROOM_ID, USER_ID, data.get('users_payload')):
                                await broadcast_payloads(ROOM_ID, USER_ID)

                                
                        if data.get('user_multiple_file_transfer_request'):
                            print('users ask for multiple files transfer')
                            userdata = data['user_multiple_file_transfer_request'].copy()
                            
                            if ROOM_CONNECTIONS[ROOM_ID].get(userdata['files_owner_id']) and userdata.get('files_owner_id')  :
                                print('HOST LOCATED')
                                HOST: WebSocket = ROOM_CONNECTIONS[ROOM_ID].get(userdata['files_owner_id'])
                                TRANSFER_ACCESS_TOKEN = str(uuid.uuid4())
                                TARGETS = userdata['files_id']
                                print(TARGETS)
                                
                                MULTIPLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN] = {
                                    # 'target': userdata['filename'],
                                    'targets': TARGETS,
                                    'HOST': userdata['files_owner_id'],
                                    'client': USER_ID,
                                    'room_id': ROOM_ID,
                                    # 'filesize': userdata['filesize'],
                                    'files_id': userdata['files_id'],
                                    'client_username': userdata['client_username']
                                }
                            
                                await HOST.send_json({
                                    'incoming_transfer': 'user wants to download your files',
                                    'role': 'HOST',
                                    'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN,
                                    'targets': TARGETS,
                                    'upload_type': 'multiple'
                                })
                                
                                
                                await ws.send_json({
                                    'incoming_transfer': 'HOST located',
                                    'role': 'client',
                                    'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN,
                                    'targets': TARGETS
                                })
                                
                                
                                
                        if data.get('user_single_file_transfer_request'):
                            userdata = data['user_single_file_transfer_request']
                            userdata:dict
                            if ROOM_CONNECTIONS.get(ROOM_ID):
                                ...
                                if ROOM_CONNECTIONS[ROOM_ID].get(userdata['file_owner_id']) and userdata.get('file_owner_id') :
                                    print('Host avaible!')
                                    HOST: WebSocket = ROOM_CONNECTIONS[ROOM_ID].get(userdata['file_owner_id'])
                                    TRANSFER_ACCESS_TOKEN = str(uuid.uuid4())
                                    
                                    TARGET = userdata['file_id']
                                    
                                    
                                    
                                    SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN] = {
                                        # 'target': userdata['filename'],
                                        'target': TARGET,
                                        'HOST': userdata['file_owner_id'],
                                        'client': USER_ID,
                                        'room_id': ROOM_ID,
                                        'filesize': userdata['filesize'],
                                        'file_id': userdata['file_id'],
                                        'client_username': userdata['client_username']
                                    }
                                    
                                    
                                    await HOST.send_json({
                                        'incoming_transfer': 'user wants to download your files!',
                                        'role': 'HOST',
                                        'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN,
                                        'target': TARGET,
                                        'upload_type': 'single'
                                    })

                                    await ws.send_json({
                                        'incoming_transfer': 'HOST located',
                                        'role': 'client',
                                        'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN,
                                        'target': TARGET
                                    })
                                    
                                    print('Room data prepared!')
                                    
                        
                    except json.JSONDecodeError:
                        print('data not in json')
                        
            except WebSocketDisconnect:
                remove_connection(ROOM_ID, USER_ID)
                unregister_user_in_room(ROOM_ID, USER_ID)
                
                await broadcast_rooms()
                
                
                await broadcast_occupancy(ROOM_ID)
                await broadcast_payloads(ROOM_ID, USER_ID)
                
                # print('user disconnected')
            
