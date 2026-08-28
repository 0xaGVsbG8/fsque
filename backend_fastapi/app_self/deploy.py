
import os
import subprocess
from app.db_conn import is_db_working
from dotenv import load_dotenv

PROD = False


def read_env():
    
    root_dir = os.path.dirname((os.path.dirname(os.path.dirname(__file__))))
    env_path = os.path.join(root_dir, '.env')
    print(env_path)
    load_dotenv(env_path)

read_env()



PORT = os.getenv('API_PORT') or '9010'
HOST = '0.0.0.0'
WORKERS = os.getenv('API_WORKERS') or 1

MAIN_PATH = os.path.join(os.path.dirname(__file__),'app', 'main.py')
print(MAIN_PATH)

def deploy():
    is_db_working()
    cmd = f"cd {os.path.dirname(MAIN_PATH)} && uvicorn {os.path.basename(MAIN_PATH).replace('.py', '')}:app --workers {WORKERS} --host {HOST} --port {PORT} {'--reload' if not PROD else ''}"  
    subprocess.run(cmd, shell=True)

deploy()
