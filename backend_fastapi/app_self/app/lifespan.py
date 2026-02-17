
from fastapi import FastAPI
import asyncio
from modules import overseer
from contextlib import asynccontextmanager



@asynccontextmanager
async def lifespan(app: FastAPI):
    #maintance task
    task = asyncio.create_task(overseer.cleanup_expired_rooms())
    yield
    task.cancel()