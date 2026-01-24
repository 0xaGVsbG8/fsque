
import os
import subprocess


PORT = '9010'
HOST = '0.0.0.0'

MAIN_PATH = os.path.join(os.path.dirname(__file__),'app', 'main.py')
print(MAIN_PATH)

def deploy():

    cmd = f"cd {os.path.dirname(MAIN_PATH)} && uvicorn {os.path.basename(MAIN_PATH).replace('.py', '')}:app --host {HOST} --port {PORT} --reload"  
    subprocess.run(cmd, shell=True)

deploy()
