
from fastapi import FastAPI, WebSocket

ROOM_CONNECTIONS = {}
USERS_PAYLOAD = {}



def count_occupancy(room_id):
    if room_id in ROOM_CONNECTIONS:
        return len(ROOM_CONNECTIONS[room_id])
    return 0






def register_user_in_room(room_id:str, USERNAME: str, USER_ID:str, temp_user_id: str):
    
    
    if not USERS_PAYLOAD.get('room_'+room_id):
        USERS_PAYLOAD['room_'+room_id] = {'user_'+USER_ID:{'username':USERNAME,'payload':[],'temp_user_id':temp_user_id}}
    else:
        USERS_PAYLOAD['room_'+room_id]['user_'+USER_ID]={'username':USERNAME,'payload':[],'temp_user_id':temp_user_id}
    
    


def unregister_user_in_room(room_id:str, USER_ID:str):
    
    if USERS_PAYLOAD.get('room_'+room_id):
        if USERS_PAYLOAD['room_'+room_id].get('user_'+USER_ID):
            del USERS_PAYLOAD['room_'+room_id]['user_'+USER_ID]
    
    

        
def store_connection(room_id:str,user_id: str, ws: WebSocket):
    if not ROOM_CONNECTIONS.get(room_id):
        ROOM_CONNECTIONS[room_id] = {user_id: ws}
    else:
        ROOM_CONNECTIONS[room_id][user_id] = ws
    



def remove_connection(room_id:str,user_id: WebSocket):
    if room_id in ROOM_CONNECTIONS:
        ROOM = ROOM_CONNECTIONS[room_id]
        if ROOM.get(user_id):
            del ROOM[user_id]