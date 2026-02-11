

import json, uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, websockets
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session

router = APIRouter()



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
            
        print('denying access')
        return False
    
    finally:
        db.close()
        
        
ROOM_CONNECTIONS = {}


#room_id: [{username: 2, user_id:2,payload:xd}]
USERS_PAYLOAD = {}


def register_user_in_room(room_id:str, USERNAME: str, USER_ID:str):
    
    
    if not USERS_PAYLOAD.get('room_'+room_id):
        USERS_PAYLOAD['room_'+room_id] = {'user_'+USER_ID:{'username':USERNAME,'payload':[2]}}
    else:
        USERS_PAYLOAD['room_'+room_id]['user_'+USER_ID]={'username':USERNAME,'payload':[2]}
        # ROOM_CONNECTIONS[room_id].append(ws)
        ...
    
    
    # print('user registered', USERS_PAYLOAD)


def unregister_user_in_room(room_id:str, USER_ID:str):
    
    if USERS_PAYLOAD.get('room_'+room_id):
        if USERS_PAYLOAD['room_'+room_id].get('user_'+USER_ID):
            del USERS_PAYLOAD['room_'+room_id]['user_'+USER_ID]
        ...
    
    
    

        
def store_connection(room_id:str,user_id: str, ws: WebSocket):
    # ROOM_CONNECTIONS.setdefault(room_id, []).append(ws)
    
    if not ROOM_CONNECTIONS.get(room_id):
        ROOM_CONNECTIONS[room_id] = {user_id: ws}
    else:
        ROOM_CONNECTIONS[room_id][user_id] = ws
    
    # print('Connection stored')


def remove_connection(room_id:str,user_id: WebSocket):
    
    if room_id in ROOM_CONNECTIONS:
        
        
        ROOM = ROOM_CONNECTIONS[room_id]
        if ROOM.get(user_id):
            del ROOM[user_id]
        # print(ROOM, 'xd?')
        
        #     ROOM_CONNECTIONS[room_id].remove(user_id)
            
        # if not ROOM_CONNECTIONS[room_id]:
        #     del ROOM_CONNECTIONS[room_id]
            
            
async def broadcast_occupancy(room_id):
    if room_id in ROOM_CONNECTIONS:
        for key, ws in ROOM_CONNECTIONS[room_id].items():
            ws: WebSocket
            await ws.send_json({'connected_users':len(ROOM_CONNECTIONS[room_id])})
            

async def broadcast_payloads(room_id):
    
    if room_id in ROOM_CONNECTIONS:
        if USERS_PAYLOAD.get('room_' + room_id):
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
                    'payload': PAYLOAD
                }
                
                user_ws_conn_info.append(data)
                
                
                # print(USER_ID, USERNAME, values)
                
            for key, ws in ROOM_CONNECTIONS[room_id].items():
                ws: WebSocket    
                await ws.send_json({
                    'users_ws_conn_info': user_ws_conn_info
                })    
                
                         

def update_users_payload(room_id, user_id, payload):
    
    if USERS_PAYLOAD.get('room_' + room_id):
        ROOM_DATA = USERS_PAYLOAD.get('room_' + room_id)
        if ROOM_DATA.get('user_' + user_id):
            USER_DATA = ROOM_DATA.get('user_' + user_id)
            USER_DATA['payload'] = payload
            # print(USER_PAYLOAD, ROOM_DATA, 'xd?')
            # print(ROOM_DATA, 'xd?')
            print('USERS PAYLOAD ALTERED')
            return True
    
    return False
        


#STRUCTURE
# [access_token: {
#     target: filename
#     HOST: id
#     client:id
# }]

SINGLE_FILE_TRANSFER_ROOMS = {}




@router.websocket("/xd")
async def websocket_endpoint(ws: WebSocket):
    
    USER_ACCESS_TOKEN = str(ws.query_params.get("USER_ACCESS_TOKEN"))
    ROOM_ID = str(ws.query_params.get("ROOM_ID"))
    USER_ID = ws.cookies.get("user_id")
    USERNAME = ws.cookies.get("username")
    
    if USER_ACCESS_TOKEN and ROOM_ID and USER_ID and USERNAME:
        print(f"Connecting to room: {ROOM_ID} ")
        if validate_token_access(ROOM_ID, USER_ID):
            await ws.accept()
            store_connection(ROOM_ID,USER_ID, ws)
            register_user_in_room(ROOM_ID,USERNAME, USER_ID)
            await broadcast_occupancy(ROOM_ID)
            await broadcast_payloads(ROOM_ID)
            
            try:
                while True:
                    data = await ws.receive_text()
                    try:
                        data = json.loads(data)
                        print(data)
                        if data.get('users_payload'):
                            print(f'received payload from user: {USERNAME} --- AND with an id of: {USER_ID}')
                            if update_users_payload(ROOM_ID, USER_ID, data.get('users_payload')):
                                await broadcast_payloads(ROOM_ID)
                                
                        if data.get('user_single_file_transfer_request'):
                            userdata = data['user_single_file_transfer_request']
                            userdata:dict
                            if ROOM_CONNECTIONS.get(ROOM_ID):
                                if ROOM_CONNECTIONS[ROOM_ID].get(userdata['file_owner_id']) and userdata.get('file_owner_id') :
                                    
                                    HOST = ROOM_CONNECTIONS[ROOM_ID].get(userdata['file_owner_id'])
                                    HOST: WebSocket
                                    
                                    print('HOST located! -->' , HOST)
                                    TRANSFER_ACCESS_TOKEN = str(uuid.uuid4())
                                    
                                    SINGLE_FILE_TRANSFER_ROOMS[TRANSFER_ACCESS_TOKEN] = {
                                        'target': userdata['filename'],
                                        'HOST': userdata['file_owner_id'],
                                        'client': USER_ID
                                    }
                                    
                                    await HOST.send_json({'incoming_transfer': 'user wants to download your files!','role': 'HOST', 'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN, 'target': userdata['filename']})
                                    await ws.send_json({'incoming_transfer': 'HOST located', 'role':'client', 'TRANSFER_ACCESS_TOKEN': TRANSFER_ACCESS_TOKEN})
                                    
                                    # print(SINGLE_FILE_TRANSFER_ROOMS, 'yopyo')
                            # HOST = ROOM_CONNECTIONS[[ROOM_ID][userdata['file_owner_id']]]
                            print('user wants to transfer')
                        
                    except json.JSONDecodeError:
                        print('data not in json')
                    # try:
                    ...
                        
            except WebSocketDisconnect:
                remove_connection(ROOM_ID, USER_ID)
                unregister_user_in_room(ROOM_ID, USER_ID)
                
                await broadcast_occupancy(ROOM_ID)
                await broadcast_payloads(ROOM_ID)
                
                print('user disconnected')
            

          
