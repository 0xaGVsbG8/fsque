from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import sys, time


#FOR DOCKER USAGE without compose
DATABASE_URL = "postgresql+psycopg2://postgres:postgres@host.docker.internal:9003/datanestDB?client_encoding=utf8"

#FOR DOCKER USAGE WITH COMPOSE
DATABASE_URL = "mysql+pymysql://root@fsque_db/fsque"
# DATABASE_URL = "mysql+pymysql://root@localhost/fsque"
# DATABASE_URL = "mysql+pymysql://root@host.docker.internal:9003/fsque"

#FOR REGULAR USAGE
# DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/datanestDB"

#Displays queries
# engine = create_engine(DATABASE_URL, echo=True)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autoflush=False,autocommit=False,bind=engine)

Base = declarative_base()
db = SessionLocal()




def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

def test_add_room():
    
    from app.views.models import room_info
    
    db_local = SessionLocal() 
    db_local.add(room_info(
        name='xd',
        owner="xd",
        password="2",
        allowed_users = [1,2]
    ))
    db_local.commit()
    db_local.close()
    

def is_db_working():
    from app.views.models import room_info
    
    time.sleep(1)
    
    
    try:
        db_local = SessionLocal() 
        rooms = db_local.query(room_info).all()

        for room in rooms:
            # print(room.name, room.visible)
            ...
            
        print('Db works!')
        
    except Exception as e:
        print('Database is not responding!')
        sys.exit()
    
    finally:
        db_local.close()
        
    
        
if __name__=='__main__':
    is_db_working()
    test_add_room()
    