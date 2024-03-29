FROM lambci/lambda:build-nodejs12.x

ENV AWS_DEFAULT_REGION us-east-1
ENV AWS_LAMBDA_FUNCTION_NAME alexa-assistant-skill-function
ENV AWS_LAMBDA_FUNCTION_TIMEOUT 600

ARG NODE_TARGET=18.12.1

COPY . .
RUN ls

RUN npm install -g n
RUN n ${NODE_TARGET}

RUN rm -rf .git .idea node_modules
RUN npm install --only=prod
RUN npm rebuild --target=${NODE_TARGET} --target_arch=x64 --target_platform=linux --target_libc=glibc
RUN zip -9yr lambda.zip .

CMD aws lambda update-function-code --function-name ${AWS_LAMBDA_FUNCTION_NAME} --cli-connect-timeout 0 --zip-file fileb://lambda.zip
