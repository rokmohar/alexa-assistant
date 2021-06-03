# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Download Release

You can download the ZIP file from the [Releases](https://github.com/rokmohar/alexa-assistant/releases)
page and upload them to the AWS Lambda function from the AWS console.

# Build and Deploy

Run the following commands:

- `docker build -t mylambda .`

- `docker run --rm -e AWS_ACCESS_KEY_ID="" -e AWS_SECRET_ACCESS_KEY="" mylambda`

You must set values of `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` variables in the command.
You can get the access key ID and secret access key in IAM section of the AWS console.
Make sure that your IAM user has role AWSLambdaFullAccess.

You can override the AWS Lambda function name by adding `-e AWS_LAMBDA_FUNCTION_NAME=""` to the docker run command.

You can copy `.env.example` to `.env` and add the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` there.
Then you can run the command following command instead:

- `docker run --rm --env-file .env mylambda`

Complete documentation for AWS Lambda Docker images can be found here:
https://hub.docker.com/r/lambci/lambda/

# New Installation via CloudFormation 

This is the easiest method as it creates the lambda function automatically for you.

If you have not installed the skill before then follow the instructions here:

[Installation Instructions](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/fresh_install.md)

# IT DOESN'T WORK / PROBLEM SOLVING

**BEFORE RAISING A QUESTION PLEASE CHECK THE PROBLEM SOLVING PAGE [HERE](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/common_problems.md)**

I get asked the same questions many times a day and most of them due are missing steps in the instructions
