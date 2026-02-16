from fastapi import APIRouter
from .APIs import add_room, read_rooms, verify_room
from .WSs import set_connection, rooms_lobby
from .WSs.make_single_transfer_modules import make_single_transfer
from .WSs.make_multiple_transfer_modules import make_multiple_transfer

views_router = APIRouter()

#APIs
views_router.include_router(add_room.router)
views_router.include_router(read_rooms.router)
views_router.include_router(verify_room.router)


#WSs
views_router.include_router(rooms_lobby.router)
views_router.include_router(set_connection.router)
views_router.include_router(make_single_transfer.router)
views_router.include_router(make_multiple_transfer.router)

print('Views room loaded in!')
