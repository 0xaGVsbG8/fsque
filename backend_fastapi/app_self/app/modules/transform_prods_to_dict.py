from pandas import DataFrame

def transform(selected_prods: DataFrame):


    selected_prods = selected_prods[[
        'Product ID',
        'Product Name',
        'Product Category',
        'Product Sub-Category',
        'Product Price',
        'Product Image'
    ]].fillna('N/A')

    selected_prods = selected_prods.rename(columns={
        'Product ID': 'prod_id',
        'Product Name': 'prod_name',
        'Product Category': 'prod_cat',
        'Product Sub-Category': 'prod_subcat',
        'Product Price': 'prod_price',
        'Product Image': 'prod_icon'
    }).to_dict(orient='records')

    return selected_prods
