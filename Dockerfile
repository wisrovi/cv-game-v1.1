FROM node:18-alpine

ARG GEMINI_API_KEY

ENV GEMINI_API_KEY=$GEMINI_API_KEY

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview"]