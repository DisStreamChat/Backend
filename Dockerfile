FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env.production .env

RUN npm run build

ENV PORT=3200

EXPOSE 3200

CMD ["npm", "run", "prod"]
