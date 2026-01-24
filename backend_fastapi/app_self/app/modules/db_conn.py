

import sqlite3, time
import uuid
from app_independencies import sqlite_db_path

db_path = sqlite_db_path

class db_conn:
    def __init__(self):
        print('asserting connection')
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()

        self.create_room_table()
        
        print(self.read_rooms())
        
        
    def __enter__(self):
        return self
        
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        print('closing conn')
        self.conn.close()
        
    def create_room_table(self):
        
        kw = """
        
        CREATE TABLE IF NOT EXISTS`rooms` (
            'id' INTEGER PRIMARY KEY AUTOINCREMENT,
            `name` varchar(255) NOT NULL,
            `password` text NOT NULL,
            `privacy` text NOT NULL DEFAULT 'public',
            `visible` tinyint(1) NOT NULL DEFAULT 1,
            'owner' t ext NOT NULL,
            'crt_date' text NOT NULL,
            'room_id' text NOT NULL
        )
        
        """
        
        self.cursor.execute(kw)
        self.conn.commit()
        print('table created')
        ...
        
    
    def read_rooms(self, js_visable = True):
        
        kw = f"""SELECT * FROM `rooms` {' WHERE visible =  True' if js_visable else ''}  """
        # print(kw)
        self.cursor.execute(kw)
        result = self.cursor.fetchall()
        return result
    
    
    
    def add_room(self, name, passwd, privacy = 'public', visible = True, owner = 'n', room_id = uuid.uuid4()):
        
        kw = f"""
        INSERT INTO `rooms` (`id`, `name`, `password`, `privacy`, `visible`, `owner`, `crt_date`, `room_id`) VALUES (NULL, '{name}', '{passwd}', '{privacy}', {visible}, '{owner}', '{time.time()}', '{room_id}');
        """
        self.cursor.execute(kw)
        self.conn.commit()
        
        print(kw, 'rqq')
        
        print('room added')
        
    
    
def read_rooms(js_visable = True):
    with db_conn() as db:
        return db.read_rooms(js_visable)
    
def add_room(name, passwd, privacy = 'public', visible = True,owner = 'n', room_id = uuid.uuid4()):
    print(name, passwd, privacy, '222')
    with db_conn() as db:
        db.add_room(name, passwd, privacy, visible, owner, room_id)
        return room_id
    
    
        
print('db conn in pool')
with db_conn() as db:
    print('xd')
    
read_rooms()
# add_room('x','2','2',True)