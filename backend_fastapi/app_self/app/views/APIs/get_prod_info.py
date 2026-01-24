from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
# from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query
import os, shutil
import pandas as pd
from modules import content_based_just_pandas, transform_prods_to_dict






@router.get('/get-prod-info')
async def view(request: Request, prod_id: str = Query(...), bg_tasks: BackgroundTasks = None):

    df = pd.read_csv(PRODS_CATALOG)
    prod_info = df[df['Product ID'] == prod_id]
    
    if not prod_info.empty:

        prod_info = transform_prods_to_dict.transform(prod_info)
        print(prod_info)

        # print(prod_info)


        #TODO: FIXED SIMILAR
        item_based_recs = content_based_just_pandas.recommend_cb(prod_id,10)
        item_based_recs_ids = item_based_recs['Product ID'].tolist()
        prods_ls = df[df['Product ID'].isin(item_based_recs_ids)]
        item_based_recs_parsed = transform_prods_to_dict.transform(prods_ls)



        # print(item_based_recs_parsed)
        # print(prods_ls, item_based_recs_ids)
        # print(item_based_recs_parsed, item_based_recs_ids)

        return {
            "prod_info": prod_info,
            'item_based_recs_parsed': item_based_recs_parsed
        }


    else:
        return {'prod_search':'not found'}

