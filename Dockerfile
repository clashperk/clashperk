FROM node:16-slim
RUN apt-get update && apt-get install -y git build-essential python3
WORKDIR /
COPY . .
RUN npm i
RUN npm run build
CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
