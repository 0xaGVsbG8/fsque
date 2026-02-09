


from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess,threading
import os
from app_independencies import OS,router, origins
# from modules import db_conn
from views import router as views_router
from fastapi import Depends
from sqlalchemy.orm import Session
from app_independencies import app
import asyncio
# from db_conn import get_db
# from views import Request_timeouter
from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from views.middlewares import assign_user_id


templates = Jinja2Templates(directory="templates")
router.mount("/static", StaticFiles(directory="static"), name="static")



router.include_router(views_router.views_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@router.get('/')
async def view(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "name": "Kierowniku"})


@router.api_route('/test/',methods=['GET','POST','DELETE','PUT','PATCH'])
async def view(request:Request):
    return ('It works!','Remote-addr -->',request.client.host)


app.include_router(router)




