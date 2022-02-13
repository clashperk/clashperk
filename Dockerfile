FROM node:16-slim

RUN apt-get update && apt-get install -y git libcairo2-dev libjpeg-dev libgif-dev libpango1.0-dev python build-essential \
	fonts-arphic-ukai fonts-arphic-uming fonts-ipafont-mincho fonts-ipafont-gothic fonts-unfonts-core fonts-arphic-uming \
	fonts-ipafont-mincho ttf-wqy-zenhei fonts-takao fonts-dejavu ttf-ancient-fonts

WORKDIR /app

COPY . /app

RUN npm i

RUN npm run build

CMD ["node", "--trace-warnings", "--enable-source-maps", "dist/src/index.js"]
