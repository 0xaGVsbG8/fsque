

import sqlite3, time,json 
import uuid
from app_independencies import sqlite_db_path

db_path = sqlite_db_path

class db_conn:
    def __init__(self):
        print('asserting connection')
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()

        self.create_room_table()
        self.create_stashed_rooms_table()
        
        # print(self.read_rooms())
        
        
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
        print('table created1')
        ...
        
        
        
    def create_stashed_rooms_table(self):
        kw = """
        
            CREATE TABLE IF NOT EXISTS`stashed_rooms` (
                'id' INTEGER PRIMARY KEY AUTOINCREMENT,
                `room_id` text NOT NULL,
                `allowed_users` text NOT NULL
            )
        
        """
        
        self.cursor.execute(kw)
        self.conn.commit()
        print('table created2')
        
        
    def stash_user_into_room(self,room_id, user_id):
        
        result = self.is_user_allowed(room_id)
        if not result:
            return 
        
        ALLOWED_USERS = json.loads(result[0][0])
        ALLOWED_USERS: list
        ALLOWED_USERS.append(user_id)
        ALLOWED_USERS = list(set(ALLOWED_USERS))
        
        kw = f"""
        UPDATE `stashed_rooms` SET `allowed_users` = '{json.dumps(ALLOWED_USERS)}' WHERE `stashed_rooms`.`room_id` = '{room_id}';
        """
        self.cursor.execute(kw)
        self.conn.commit()
        
        
    def is_user_allowed(self, room_id):
        kw = f"""SELECT allowed_users FROM `stashed_rooms` where room_id = '{room_id}'"""
        self.cursor.execute(kw)
        result = self.cursor.fetchall()
        return result
    
    def create_default_record_in_stashed_rooms(self, room_id):
        kw = f"""
        INSERT INTO `stashed_rooms` (`id`, `room_id`, `allowed_users`) VALUES (NULL, '{room_id}', '[]');
        """
        self.cursor.execute(kw)
        self.conn.commit()
        
        print('added a default record')
        
    
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
        
        # print(kw, 'rqq')
        
        print('room added')
        
    
    
    
def read_rooms(js_visable = True):
    with db_conn() as db:
        return db.read_rooms(js_visable)
    
    
def add_room(name, passwd, privacy = 'public', visible = True,owner = 'n', room_id = uuid.uuid4()):
    print(name, passwd, privacy, '222')
    with db_conn() as db:
        db.add_room(name, passwd, privacy, visible, owner, room_id)
        return room_id
    
def create_default_record_in_stashed_rooms(room_id: str):
    with db_conn() as db:
        db.create_default_record_in_stashed_rooms(room_id)
 

def is_user_allowed(room_id, user_id):
    with db_conn() as db:
        result = db.is_user_allowed(room_id)
        if result:
            ALLOWED_USERS = json.loads(result[0][0])
            print(ALLOWED_USERS,'users?', user_id)
            if user_id in ALLOWED_USERS:
                print('user allowed')
                return True
            
        return False
        
        
def stash_user_into_room(room_id, user_id):
    with db_conn() as db:
        db.stash_user_into_room(room_id, user_id)            
 
    
 
  
        
print('db conn in pool')
with db_conn() as db:
    print('xd')
    
# read_rooms()
# add_room('x','2','2',True)