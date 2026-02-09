

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# from ..APIs.verify_room import STASHED_ROOMS, ACCESS_TOKENS
from ..APIs.verify_room import STASHED_ROOMS


router = APIRouter()

# Dictionary to track active WebSocket connections in each room
# Format: {room_id: [WebSocket, WebSocket, ...]}
ROOM_CONNECTIONS = {}

# Dictionary to track items per user in each room
# Format: {room_id: {username: [items]}}
ROOM_ITEMS = {}

async def broadcast_occupancy(room_id: str):
    """Notify all connected users in a room about the current occupancy and usernames."""
    if room_id in ROOM_CONNECTIONS:
        occupancy = len(ROOM_CONNECTIONS[room_id])
        # Get list of usernames for this room from ROOM_ITEMS
        username_ls = list(ROOM_ITEMS.get(room_id, {}).keys())
        
        disconnected = []
        for connection in ROOM_CONNECTIONS[room_id]:
            try:
                await connection.send_json({
                    'connected_users': occupancy,
                    'username_ls': username_ls
                })
            except Exception:
                disconnected.append(connection)
        
        # Clean up any dead connections found during broadcast
        for dead_conn in disconnected:
            if dead_conn in ROOM_CONNECTIONS[room_id]:
                ROOM_CONNECTIONS[room_id].remove(dead_conn)

def remove_connection(room_id: str, ws: WebSocket):
    """Remove a connection from the room tracking dictionary."""
    if room_id in ROOM_CONNECTIONS:
        if ws in ROOM_CONNECTIONS[room_id]:
            ROOM_CONNECTIONS[room_id].remove(ws)
        
        # If room is empty, clean up the key
        if not ROOM_CONNECTIONS[room_id]:
            del ROOM_CONNECTIONS[room_id]
            return False # Room is now empty
    return True # Room still has users


def validate_token_access(ROOM_ID: str,USER_ACCESS_TOKEN: str):
    if ROOM_ID in  STASHED_ROOMS:
        print('room exists!')
        ACCESS_TOKENS = set(STASHED_ROOMS[ROOM_ID])
        print(ACCESS_TOKENS)
        if USER_ACCESS_TOKEN in ACCESS_TOKENS:
            print('Token is valid')
            return True
        
    return False
            # await ws.accept() 
            
            # Add connection to the room



@router.websocket("/xd")
async def websocket_endpoint(ws: WebSocket):
    
    USER_ACCESS_TOKEN = str(ws.query_params.get("USER_ACCESS_TOKEN"))
    ROOM_ID = str(ws.query_params.get("ROOM_ID"))
    
    if USER_ACCESS_TOKEN and ROOM_ID:
        print(f"Received token: {USER_ACCESS_TOKEN} ")
        
        if validate_token_access(ROOM_ID, USER_ACCESS_TOKEN):
            
            await ws.accept()

            if ROOM_ID not in ROOM_CONNECTIONS:
                ROOM_CONNECTIONS[ROOM_ID] = []
            ROOM_CONNECTIONS[ROOM_ID].append(ws)
                # Notify everyone in the room that someone joined
            await broadcast_occupancy(ROOM_ID)
            print(f"User joined room {ROOM_ID}. Current occupancy: {len(ROOM_CONNECTIONS[ROOM_ID])}")

            try:
                while True:
                    # Keep connection alive and handle messages if needed
                    data = await ws.receive_text()
                    try:
                        # Expecting JSON like {"username": "xd", "item": "some_item"}
                        # or similar structure to extract username and item
                        payload = json.loads(data)
                        username = payload.get("username")
                        item = 2
                        # item = payload.get("item")

                        if username and item:
                            if ROOM_ID not in ROOM_ITEMS:
                                ROOM_ITEMS[ROOM_ID] = {}
                            if username not in ROOM_ITEMS[ROOM_ID]:
                                ROOM_ITEMS[ROOM_ID][username] = []
                            
                            ROOM_ITEMS[ROOM_ID][username].append(item)
                            print(f"Stored item for {username} in {ROOM_ID}: {item}")
                            print(f"Current ROOM_ITEMS: {ROOM_ITEMS}")
                            
                            await broadcast_occupancy(ROOM_ID)

                    except json.JSONDecodeError:
                        print(f"Received non-JSON data from {ROOM_ID}: {data}")
                    
                    print(f"Received from {ROOM_ID}: {data}")
                    # await ws.send_text(f"Server received: {data}")
                    
            except WebSocketDisconnect:
                # Remove connection from the room
                if remove_connection(ROOM_ID, ws):
                    # Notify remaining users that someone left
                    await broadcast_occupancy(ROOM_ID)
                    
            print(f"User left room {ROOM_ID}. Current occupancy: {len(ROOM_CONNECTIONS.get(ROOM_ID, []))}")
        
  
