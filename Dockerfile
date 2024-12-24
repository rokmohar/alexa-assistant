FROM node:20

COPY . .

RUN apt update && apt install zip

RUN npm ci
RUN npm run build

RUN cp package.json dist

RUN cd dist ; zip -9yr lambda.zip .
RUN mv dist/lambda.zip .
