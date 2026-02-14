from fastapi import APIRouter
from .APIs import add_room, read_rooms, verify_room
from .WSs import set_connection, make_transfer, rooms_lobby

views_router = APIRouter()

#APIs
views_router.include_router(add_room.router)
views_router.include_router(read_rooms.router)
views_router.include_router(verify_room.router)


#WSs
views_router.include_router(rooms_lobby.router)
views_router.include_router(set_connection.router)
views_router.include_router(make_transfer.router)

print('Views room loaded in!')
