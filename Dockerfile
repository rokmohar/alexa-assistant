FROM node:22

COPY . .

RUN apt update && apt install zip

RUN export NODE_VERSION=$(node -p "process.versions.modules")

RUN npm ci
RUN npm rebuild --target=${NODE_VERSION} --target_arch=x64 --target_platform=linux --target_libc=glibc
RUN npm run build

RUN cp package.json dist

RUN cd dist ; zip -9yr lambda.zip .
RUN mv dist/lambda.zip .
