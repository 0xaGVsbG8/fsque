from fastapi import APIRouter
from .APIs import add_room, read_rooms

views_router = APIRouter()
views_router.include_router(add_room.router)
views_router.include_router(read_rooms.router)
