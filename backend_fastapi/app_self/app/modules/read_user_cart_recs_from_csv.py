

import pandas as pd
import asyncio
import json
from app_independencies import STASHED_CART_RECS
from .append_user_cart_recs_to_csv import lock


async def read(user_id: str):

    async with lock:
        df = pd.read_csv(STASHED_CART_RECS)

        user_id = str(user_id)
        df['user_id'] = df['user_id'].astype(str)

        df = df[df['user_id'] == user_id]

        if len(df) > 0:
            user_recs = df['recs'].iloc[0]
        else:
            user_recs = False
        # print(user_recs, '22?')
        return user_recs