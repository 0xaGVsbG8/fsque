from fastapi import APIRouter
from .APIs import add_room, read_rooms, verify_room

views_router = APIRouter()
views_router.include_router(add_room.router)
views_router.include_router(read_rooms.router)
views_router.include_router(verify_room.router)
