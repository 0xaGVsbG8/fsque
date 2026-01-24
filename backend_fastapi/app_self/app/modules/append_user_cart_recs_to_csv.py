

import pandas as pd
import asyncio
import json
from app_independencies import STASHED_CART_RECS

lock = asyncio.Lock()


async def add(user_id: str, recs: list):

    async with lock:
        
        df = pd.read_csv(STASHED_CART_RECS)
        
        user_id = str(user_id)
        df['user_id'] = df['user_id'].astype(str)

        df = df[df['user_id'] != user_id]
        df = df.dropna()

        new_record = {
            'user_id': user_id,
            'recs': recs
        }
        new_record = pd.DataFrame([new_record])

        df = pd.concat([df, new_record], ignore_index=True)
        df.to_csv(STASHED_CART_RECS, index=False)

        print('data dumped')


def add_sync(user_id: str, recs: list):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(add(user_id, recs))
    loop.close()