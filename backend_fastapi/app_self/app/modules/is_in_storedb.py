
import pandas as pd
from app_independencies import PRODS_CATALOG

def get_by_name(prod_name: str, df = None):

    prod_name = prod_name.strip()

    if df is None:
        df = pd.read_csv(PRODS_CATALOG)
    
    if df['Product Name'].isin([prod_name]).sum() == 0:
        return False
        
    return True

    ...


def get_by_id(prod_id: str, df = None):

    # prod_name = prod_name.strip()

    if df is None:
        df = pd.read_csv(PRODS_CATALOG)
    
    if df['Product ID'].isin([prod_id]).sum() == 0:
        return False
    
    
    return True

    ...