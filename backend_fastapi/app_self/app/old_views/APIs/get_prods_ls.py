from app_independencies import router,Request, PRODS_CATALOG, PRODS_PER_REQUEST
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Query
import os, shutil
import pandas as pd
from modules import transform_prods_to_dict



# @router.get('/get-prods-ls')
# async def view(request: Request, offset: int = Query(...), bg_tasks: BackgroundTasks = None):


#     df = pd.read_csv(PRODS_CATALOG)
#     selected_prods = df.iloc[offset: offset + PRODS_PER_REQUEST + 1]
#     selected_prods = selected_prods.fillna('N/A')
#     print('contact', selected_prods.columns)
#     print(selected_prods)
#     data = []

#     for idx, row in selected_prods.iterrows():
#         prod_info = {
#             'prod_name': row['Product Name'],
#             'prod_cat': row['Product Category'],
#             'prod_subcat': row['Product Sub-Category'],
#             'prod_price': row['Product Price'],
#             'prod_icon': row['Product Image'],
#         }
#         data.append(prod_info)

#     return data
#     ...



@router.get('/get-prods-ls')
async def view(request: Request, 
            #    offset: int = Query(...), 
               bg_tasks: BackgroundTasks = None
               ):

    df = pd.read_csv(PRODS_CATALOG)
    
    # selected_prods = df.iloc[offset: offset + PRODS_PER_REQUEST + 1].fillna('N/A')
    selected_prods = df.fillna('N/A')
    prods_data = transform_prods_to_dict.transform(selected_prods)
    # print(prods_data[:200])

    prods_cats = df['Product Category'].unique().tolist()
    prods_subcats = df['Product Sub-Category'].unique().tolist()

    data = {
        'prods_data': prods_data,
        'prods_cats': prods_cats,
        'prods_subcats': prods_subcats
    }

    return data
