from app_independencies import app, Request
from fastapi.responses import Response
from fastapi.websockets import WebSocket
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import uuid


class ASSIGN_CLIENT_ID(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        
        # BaseHTTPMiddleware breaks WebSocket connections — skip for WS
    
        
        if not request.cookies.get('user_id'):
            print('no user id yet')
            token = str(uuid.uuid4())
        else:
            token = request.cookies.get('user_id')
        request.state.user_id = token

        

        response: Response = await call_next(request)

        if not request.cookies.get('user_id'):
            response.set_cookie(
                key = 'user_id',
                value = token,
                path='/',
                max_age=60*60*24*365*10,
                httponly = True
            )

        return response
    
    
app.add_middleware(ASSIGN_CLIENT_ID)


print('user id assigner in work!')