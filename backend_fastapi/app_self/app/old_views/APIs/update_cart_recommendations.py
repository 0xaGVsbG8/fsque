from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
from modules import drop_user_cart_rec_from_csv, content_based_just_pandas, append_user_cart_recs_to_csv, is_in_storedb, recommended_for_user_cart_based
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query, Response
import os, shutil
import pandas as pd
from typing import List
from pydantic import BaseModel
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

SIMILAR_PRODS_COUNT = 5

RECS_WORKERS = 0
MAX_RECS_WORKER = 200
RECS_WORKERS_TIMEOUT = 10 #secs

executor = ThreadPoolExecutor(max_workers=4)


class CART_CONTENT(BaseModel):
    cart: List[str]
 
 
async def update_recommendations(cart_list, user_id):
    global RECS_WORKERS, MAX_RECS_WORKER
    recs, prods_id = recommended_for_user_cart_based.get_recomendation(cart_list)
    
    #asyncio/executor APROACH
    # await append_user_cart_recs_to_csv.add_sync(user_id, prods_id)
     
    await append_user_cart_recs_to_csv.add(user_id, prods_id)
    RECS_WORKERS -= 1
    


@router.post('/update_cart_recommendations/')
async def view(request: Request, cart: CART_CONTENT, response: Response, bg_tasks: BackgroundTasks = None):

    global RECS_WORKERS, MAX_RECS_WORKER
    
    user_id = request.state.user_id
    
    cart_list = list(set(cart.cart))
    print(cart_list)

    keep = []

    for prod in cart_list:
        print(prod,is_in_storedb.get_by_id(prod))
        keep.append(prod) if is_in_storedb.get_by_id(prod) else None

    cart_list = keep

    if len(cart_list) < 2:
        print('insufficient cart data')
        bg_tasks.add_task(drop_user_cart_rec_from_csv.drop, user_id)
        return None
    
    
    # bg_tasks.add_task(update_recommendations, cart_list, user_id)




    #asyncio/executor APROACHAPROACH
    
    # loop = asyncio.get_event_loop()


    # loop.run_in_executor(
    #     executor,
    #     update_recommendations,  # funkcja sync
    #     cart_list,
    #     user_id
    # )
    
    
    #THREADING APROACH
    
    RECS_WORKERS+=1
    
    if RECS_WORKERS > MAX_RECS_WORKER:
        while RECS_WORKERS > MAX_RECS_WORKER:
            await asyncio.sleep(2)
    # threading.Thread(target=update_recommendations, args=(cart_list, user_id,),daemon=True).start()
    #THREADING APROACH
            
            
    asyncio.create_task(update_recommendations(cart_list, user_id))
    # await update_recommendations(cart_list, user_id)
    # threading.Thread(target=update_recommendations, args=(cart_list, user_id,),daemon=True).start()
    

  


# testlink = 'http://localhost:9010/backend/get-similar-prods?prod_name=Plantronics%20CS510%20-%20Over-the-Head%20monaural%20Wireless%20Headset%20System'