from app_independencies import app, router,Request, PREFIX
from fastapi.responses import Response, JSONResponse
from fastapi import status
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import and_
from pydantic import BaseModel
import time
from typing import cast, Dict


MAX_REQUESTS_AMOUNT = 20
MAX_REQUESTS_PER =  6 #secs
            
    
class client_data_props(BaseModel):
    first_request: float
    requests_amount: int

            
clients_data: Dict[str, client_data_props] = {}
        
        
class Requests_timeouter(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        URL = request.url.path
        client_ip = request.client.host

        if client_ip not in clients_data:
            clients_data[client_ip] = client_data_props(
                first_request = time.time(),
                requests_amount = 1
            )

        client_data = clients_data[client_ip]
        client_data = cast(client_data_props, client_data)

        
        TIME_PASSED_SINCE_FIRST_REQUEST = time.time() - client_data.first_request
        client_data.requests_amount += 1
        
        if TIME_PASSED_SINCE_FIRST_REQUEST > MAX_REQUESTS_PER:
            client_data.first_request = time.time()
            client_data.requests_amount = 1


        if client_data.requests_amount > MAX_REQUESTS_AMOUNT:
            return JSONResponse(
                {"detail": "Too many requests"},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )

        response: Response = await call_next(request)
        return response
        
print('request timeouter added to the pull!')
app.add_middleware(Requests_timeouter)