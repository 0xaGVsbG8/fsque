

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS
from db_conn import get_db
from views.models import room_info
from sqlalchemy.orm import Session

router = APIRouter()

# Dictionary to track active WebSocket connections in each room
# Format: {room_id: [WebSocket, WebSocket, ...]}

# Dictionary to track items per user in each room
# Format: {room_id: {username: [items]}}

# async def broadcast_occupancy(room_id: str):
#     """Notify all connected users in a room about the current occupancy and usernames."""
#     if room_id in ROOM_CONNECTIONS:
#         occupancy = len(ROOM_CONNECTIONS[room_id])
#         # Get list of usernames for this room from ROOM_ITEMS
#         username_ls = list(ROOM_ITEMS.get(room_id, {}).keys())
        
#         disconnected = []
#         for connection in ROOM_CONNECTIONS[room_id]:
#             try:
#                 await connection.send_json({
#                     'connected_users': occupancy,
#                     'users_ws_conn_info': [{'username':2,'payload':'xd'}]
#                 })
#             except Exception:
#                 disconnected.append(connection)
        
#         # Clean up any dead connections found during broadcast
#         for dead_conn in disconnected:
#             if dead_conn in ROOM_CONNECTIONS[room_id]:
#                 ROOM_CONNECTIONS[room_id].remove(dead_conn)

# def remove_connection(room_id: str, ws: WebSocket):
#     """Remove a connection from the room tracking dictionary."""
#     if room_id in ROOM_CONNECTIONS:
#         if ws in ROOM_CONNECTIONS[room_id]:
#             ROOM_CONNECTIONS[room_id].remove(ws)
        
#         # If room is empty, clean up the key
#         if not ROOM_CONNECTIONS[room_id]:
#             del ROOM_CONNECTIONS[room_id]
#             return False # Room is now empty
#     return True # Room still has users


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
    
    
    print('user registered', USERS_PAYLOAD)


def unregister_user_in_room(room_id:str, USERNAME: str, USER_ID:str):
    
    if USERS_PAYLOAD.get('room_'+room_id):
        if USERS_PAYLOAD['room_'+room_id].get('user_'+USER_ID):
            print('found user that left')
            del USERS_PAYLOAD['room_'+room_id]['user_'+USER_ID]
        ...
    
    
    print('user registered', USERS_PAYLOAD)
    
    
# def unregister_user_in_room(room_id:str, USERNAME: str, USER_ID:str):
#     if room_id in USERS_PAYLOAD:
        
        
def store_connection(room_id:str,ws: WebSocket):
    ROOM_CONNECTIONS.setdefault(room_id, []).append(ws)
    
    # if not ROOM_CONNECTIONS.get(room_id):
    #     ROOM_CONNECTIONS[room_id] = [ws]
    # else:
    #     ROOM_CONNECTIONS[room_id].append(ws)
    
    print('Connection stored')


def remove_connection(room_id:str,ws: WebSocket):
    
    if room_id in ROOM_CONNECTIONS:
        
        if ws in ROOM_CONNECTIONS[room_id]:
            ROOM_CONNECTIONS[room_id].remove(ws)
            
        if not ROOM_CONNECTIONS[room_id]:
            del ROOM_CONNECTIONS[room_id]
            
            
async def broadcast_occupancy(room_id):
    if room_id in ROOM_CONNECTIONS:
        for ws in ROOM_CONNECTIONS[room_id]:
            ws: WebSocket
            await ws.send_json({'connected_users':len(ROOM_CONNECTIONS[room_id])})
            




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
            store_connection(ROOM_ID, ws)
            register_user_in_room(ROOM_ID,USERNAME, USER_ID)
            await broadcast_occupancy(ROOM_ID)
            
            try:
                while True:
                    data = await ws.receive_text()
                    # try:
                    ...
                        
            except WebSocketDisconnect:
                remove_connection(ROOM_ID, ws)
                unregister_user_in_room(ROOM_ID,USERNAME, USER_ID)
                
                await broadcast_occupancy(ROOM_ID)
                print('user disconnected')
            

          
