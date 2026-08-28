

import platform,os
from fastapi import APIRouter, FastAPI, Request
from uuid import uuid4
from dotenv import load_dotenv

PREFIX='/backend'

from lifespan import lifespan



OS = platform.system().lower()

DEPLOY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)),'deploy.py')


models_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'models.py')
schemas_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'schemas.py')
app_path = os.path.join(os.path.dirname(__file__),'main.py')

sqlite_db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'db.sqlite')



app = FastAPI(
    # docs_url=None,
    # redoc_url=None,
    # openapi_url=False,
    lifespan=lifespan #Cycle of maintance tasks
)
#unmark those to disable public docs






#-------------------------------
#-------------------------------
#INSERT YOUR CORS HERE
#------------------------------
#------------------------------


origins = [
    # '*' #dev only,
    'http://localhost:9000',
    'http://localhost:3000',
    'https://berkehut.ddns.net',
    'https://zst-href.rest',
]


router = APIRouter(prefix=PREFIX)

