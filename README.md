# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Download Release

You can download the ZIP file from the [Releases](https://github.com/rokmohar/alexa-assistant/releases)
page and upload them to the AWS Lambda function from the AWS console.

# Build and Deploy

Run the following commands:

`docker build -t mylambda .`

You can copy ZIP archive file from the Docker image to your host machine with the command:

`docker run --rm --entrypoint cat mylambda ./lambda.zip > ./lambda.zip`

# New Installation via CloudFormation

This is the easiest method as it creates the lambda function automatically for you.

If you have not installed the skill before then follow the instructions here:

[Installation Instructions](docs/fresh_install.md)

# IT DOESN'T WORK / PROBLEM SOLVING

**BEFORE RAISING A QUESTION PLEASE CHECK THE PROBLEM SOLVING PAGE [HERE](docs/common_problems.md)**
