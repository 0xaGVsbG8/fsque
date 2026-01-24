from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
from modules import transform_prods_to_dict, content_based_just_pandas, is_in_storedb, recommended_for_user_cart_based, read_user_cart_recs_from_csv, apriori
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query
import os, shutil
import pandas as pd
from typing import List
import ast

SIMILAR_PRODS_COUNT = 5



@router.get('/get_accessories/')
async def view(request: Request, prod_id: str = Query(...), bg_tasks: BackgroundTasks = None):
  
    user_id = request.state.user_id
    prods_id = await read_user_cart_recs_from_csv.read(user_id)

    if prods_id:
        prods_id = ast.literal_eval(prods_id)
        df = pd.read_csv(PRODS_CATALOG)
        prod_name = df[df['Product ID']==prod_id].iloc[0][f'Product Name']
        print(prod_name)
        result = apriori.recommend_based_on_prod(prod_name, top_n=5)
        recommended_prods = df[df[f'Product Name'].isin(result)].drop_duplicates(subset='Product ID')
        print(recommended_prods, 'yoyo')
        prods_data = transform_prods_to_dict.transform(recommended_prods)
        # print('xd?')

        return {'accessories_prods' : prods_data}
        
    else:
        print('no recs yet')
        return {'prods_data' : 'N/A'}

# testlink = 'http://localhost:9010/backend/get-similar-prods?prod_name=Plantronics%20CS510%20-%20Over-the-Head%20monaural%20Wireless%20Headset%20System'tttt