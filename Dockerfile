FROM node:16-slim

WORKDIR /app

COPY package.json /app/package.json

RUN npm i

COPY . /app

RUN npm run build

CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
