FROM lambci/lambda:build-nodejs10.x

ENV AWS_DEFAULT_REGION us-east-1

COPY . .

RUN npm install
RUN zip -9yr lambda.zip .

ARG AWS_LAMBDA_NAME
ENV AWS_LAMBDA_NAME=$AWS_LAMBDA_NAME

CMD aws lambda update-function-code --function-name "${AWS_LAMBDA_NAME}" --zip-file fileb://lambda.zip
