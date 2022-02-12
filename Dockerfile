FROM node:16-slim

RUN apt-get update && apt-get install -y git

WORKDIR /app

COPY . /app

RUN npm i

RUN npm run build

CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
