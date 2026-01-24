

import pandas as pd
import asyncio
import json
from app_independencies import STASHED_CART_RECS
from .append_user_cart_recs_to_csv import lock


async def drop(user_id: str):

    async with lock:
        df = pd.read_csv(STASHED_CART_RECS)

        user_id = str(user_id)
        df['user_id'] = df['user_id'].astype(str)

        df = df[df['user_id'] != user_id]
        df.to_csv(STASHED_CART_RECS, index=False)

       