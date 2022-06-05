FROM node:16-slim as build
RUN apt-get update && apt-get install -y git build-essential python3
WORKDIR /app
COPY . /app
RUN npm i
RUN npm run build

FROM node:16-slim
RUN apt-get update && apt-get install -y git build-essential python3
WORKDIR /app
COPY .git package.json package-lock.json /app/
COPY scripts/routes.proto /app/scripts/routes.proto
COPY --from=build /app/dist /app/dist
RUN npm i --production
CMD ["node", "--trace-warnings", "--enable-source-maps", "--es-module-specifier-resolution=node", "dist/src/index.js"]
