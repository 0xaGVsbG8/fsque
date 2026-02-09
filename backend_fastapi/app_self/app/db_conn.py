from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker



#FOR DOCKER USAGE without compose
DATABASE_URL = "postgresql+psycopg2://postgres:postgres@host.docker.internal:9003/datanestDB?client_encoding=utf8"

#FOR DOCKER USAGE WITH COMPOSE
DATABASE_URL = "mysql+pymysql://root@localhost/fsque"


#FOR REGULAR USAGE
# DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/datanestDB"


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
        
        
if __name__=='__main__':
    from views.models import room_info
    db_local = SessionLocal() 
    rooms = db_local.query(room_info).all()

    for room in rooms:
        print(room.name)