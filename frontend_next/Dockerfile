FROM node:22-alpine

WORKDIR /app

COPY app_self/package.json app_self/package-lock.json* ./
RUN if [ ! -d "node_modules" ]; then npm ci; fi
RUN npm install uuid --save

COPY app_self/ .

# RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]
# CMD ["npm", "start"]
