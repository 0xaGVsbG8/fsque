
import os
import subprocess
from app.db_conn import is_db_working

PORT = '9010'
HOST = '0.0.0.0'

MAIN_PATH = os.path.join(os.path.dirname(__file__),'app', 'main.py')
print(MAIN_PATH)

def deploy():
    
    is_db_working()
    cmd = f"cd {os.path.dirname(MAIN_PATH)} && uvicorn {os.path.basename(MAIN_PATH).replace('.py', '')}:app --host {HOST} --port {PORT} --reload"  
    subprocess.run(cmd, shell=True)

deploy()
