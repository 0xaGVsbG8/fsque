FROM node:22-alpine

WORKDIR /app

COPY app_self/package.json app_self/package-lock.json* ./
RUN if [ ! -d "node_modules" ]; then npm ci; fi
RUN npm install uuid --save

COPY app_self/ .

# Build-time env vars (passed via docker-compose build args)
ARG API_PORT
ARG API_BASE_URL
ARG USE_SSL
ENV API_PORT=$API_PORT
ENV API_BASE_URL=$API_BASE_URL
ENV USE_SSL=$USE_SSL

RUN npm run build

EXPOSE 9011

# CMD ["npm", "run", "build"]
CMD ["npm", "start"]
