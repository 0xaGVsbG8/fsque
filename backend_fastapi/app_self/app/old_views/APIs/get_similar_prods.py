from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
from modules import content_based_just_pandas, is_in_storedb
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query
import os, shutil
import pandas as pd

SIMILAR_PRODS_COUNT = 5


# NOT IN USE


@router.get('/get-similar-prods')
async def view(request: Request, prod_name: str = Query(...), bg_tasks: BackgroundTasks = None):
    if not is_in_storedb.get_by_name(prod_name):
        return 'Prod not in db'
    
    result = content_based_just_pandas.recommend_cb(prod_name)
    print(result)




    selected_prods = result[[
        'Product Name',
        # 'Product Category',
        # 'Product Sub-Category',
        # 'Product Price',
        # 'Product Image'
    ]]

    prods_data = selected_prods.rename(columns={
        'Product Name': 'prod_name',
        # 'Product Category': 'prod_cat',
        # 'Product Sub-Category': 'prod_subcat',
        # 'Product Price': 'prod_price',
        # 'Product Image': 'prod_icon'
    }).to_dict(orient='records')

    return prods_data


testlink = 'http://localhost:9010/backend/get-similar-prods?prod_name=Plantronics%20CS510%20-%20Over-the-Head%20monaural%20Wireless%20Headset%20System'