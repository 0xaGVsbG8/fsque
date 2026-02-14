

import asyncio, time
from webbrowser import get
from .touchRoomRecord import TouchRoom
from db_conn import get_db
from views.models import room_info
from views.WSs.set_connection import count_occupancy

MAX_AGE =  10 * 60 #seconds

async def cleanup_expired_rooms():
    
    
    try:
        while True:
            db = next(get_db())
            
            try:
                result = db.query(room_info).all()
                for record in result:
                    
                    try:
                        if time.time()  - record.lastActivity > MAX_AGE:
                            
                            if count_occupancy(record.token) > 0:
                                print('Someone is still inside a room!')
                                TouchRoom(record.token)
                                continue
                            
                            print('deleting room -->',record.token)
                            db.delete(record)
                            
                    except Exception as e:
                        ...
                        
                db.commit()
                
            finally:
                db.close()
                
            await asyncio.sleep(30)

    except asyncio.CancelledError:
        print("Cleanup task stopped, Probable cause: main app stopped working!")