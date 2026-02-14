

import platform,os
from fastapi import APIRouter, FastAPI, Request
from uuid import uuid4

PREFIX='/backend'

from lifespan import lifespan


# ROOT_EMAIL = 'root@dash.io'
# ROOT_PASSWD = 'qwerty'
# ROOT_USER_ID = str(uuid4())


OS = platform.system().lower()
# OVERSEER_PATH = os.path.join(os.path.dirname(__file__),'overseer.py')

DEPLOY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)),'deploy.py')

# SEND_MAILS = True
# SENDER_EMAIL = "fuzzdisk@gmail.com"
# SENDER_EMAIL_PASSWORD = "avhi wyig ptvo mthg" #Gmail account app code
 

# ALLOW_TEST_ACC_FOR_DEV_PURPOSES = True # allows a dev | regular user to log in as temp@gmail.com and with any password without checking db and etc...
# TEST_ACC_FOR_DEV_PURPOSES = 'temp@gmail.com'



# ZIP_ARC_LIFESPAN = 25200 #secs (7 hours)

models_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'models.py')
schemas_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'schemas.py')
app_path = os.path.join(os.path.dirname(__file__),'main.py')

STORE_STUFF = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),'store_stuff')
PRODS_CATALOG = os.path.join(STORE_STUFF,'products_catalog.csv')
GLOBAL_SUPERSTORE_CSV = os.path.join(STORE_STUFF,'Global_Superstore2.csv')
PRODS_PER_REQUEST = 20
# STASHED_CART_RECS = os.path.join(os.path.dirname(__file__),'stashed_cart_recs.csv')
sqlite_db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),'db.sqlite')


# __STORAGE_VAULT_PATH_MAIN = (os.path.join(os.path.dirname(os.path.dirname(__file__)),'__STORAGE_VAULT')).replace('\\','/')
# __STORAGE_VAULT_PATH = os.path.join(__STORAGE_VAULT_PATH_MAIN, 'USERS')


# CONF_JSON = os.path.join(__STORAGE_VAULT_PATH_MAIN, 'config.json')


#loading a default json conf
# if not os.path.exists(CONF_JSON):
#     with open(CONF_JSON, 'w') as f:
#         f.write("""
# {
#     "_comment": "in GBs",
#     "MAX_STORAGE_PER_ACCOUNT": 22.0,
#     "MAX_UPLOAD_SIZE": 22.0
# }
# """)
        

# ZIP_ARCS_PATH = (os.path.join(__STORAGE_VAULT_PATH_MAIN, 'ZIP_ARCS')).replace('\\','/')


app = FastAPI(
    # docs_url=None,
    # redoc_url=None,
    # openapi_url=False,
    lifespan=lifespan
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
    'https://woodruf.webkit.webhop.me',
    'https://zst-href.rest'
]


router = APIRouter(prefix=PREFIX)

