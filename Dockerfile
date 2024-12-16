FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY /locales /app/locales
COPY /src /app/src

COPY --from=deps /app/dist ./dist

ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA

ENV NODE_OPTIONS="--trace-warnings --enable-source-maps"
ENV TZ=UTC
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/src/index.js"]
