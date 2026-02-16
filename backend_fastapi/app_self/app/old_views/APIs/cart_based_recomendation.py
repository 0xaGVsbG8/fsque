from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
from modules import content_based_just_pandas, is_in_storedb, recommended_for_user_cart_based
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query
import os, shutil
import pandas as pd
from typing import List

SIMILAR_PRODS_COUNT = 5



@router.get('/cart_based_recomendation')
async def view(request: Request, cart: str = Query(...), bg_tasks: BackgroundTasks = None):
    cart_list = cart.split(",")
    keep = []

    for prod in cart_list:
        print(prod,is_in_storedb.get_by_id(prod))
        keep.append(prod) if is_in_storedb.get_by_id(prod) else None

    cart_list = keep

    if len(cart_list) < 2:
        print('insufficient cart data')
        return None
    
    recs = recommended_for_user_cart_based.get_recomendation(cart)
    prod_names =  recs.index.tolist()
    print('xx',prod_names, 'xx')
    return prod_names
    
    # if not is_in_storedb.get_by_name(prod_name):
    #     return 'Prod not in db'
    ...



# testlink = 'http://localhost:9010/backend/get-similar-prods?prod_name=Plantronics%20CS510%20-%20Over-the-Head%20monaural%20Wireless%20Headset%20System'