FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=deps /app/dist ./dist

ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA

CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
