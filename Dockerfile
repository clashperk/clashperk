FROM node:16-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:16-alpine AS runner
WORKDIR /app

COPY package*.json ./

ENV NODE_ENV production

RUN npm install --omit=dev

COPY . .

COPY --from=deps /app/dist ./dist

EXPOSE 8080

ENV PORT 8080

CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
