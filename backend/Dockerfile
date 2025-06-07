FROM node:18.18.0

WORKDIR /backend

COPY package*.json ./

RUN npm install --only=prod

COPY . .

RUN cp ./configProd.mjs config.mjs

EXPOSE 3000

CMD ["npm", "run", "prod"]