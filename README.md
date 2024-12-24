# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Download Release

You can download the ZIP file from the [Releases](https://github.com/rokmohar/alexa-assistant/releases)
page and upload them to the AWS Lambda function from the AWS console.

# Installation

## Recommended: Serverless Framework Installation

The recommended way to install the skill is using the Serverless Framework. This provides the most up-to-date and maintainable deployment method.

Follow the instructions here:

[Serverless Installation Instructions](docs/serverless_install.md)

## Legacy: CloudFormation Installation (Deprecated)

> **Note:** This installation method is deprecated. Please use the Serverless Framework installation method instead.

If you have not installed the skill before then follow the instructions here:

[CloudFormation Installation Instructions](docs/fresh_install.md)

## Build from Docker

Run the following commands:

`docker build -t mylambda .`

You can copy ZIP archive file from the Docker image to your host machine with the command:

`docker run --rm --entrypoint cat mylambda ./lambda.zip > ./lambda.zip`

# IT DOESN'T WORK / PROBLEM SOLVING

**BEFORE RAISING A QUESTION PLEASE CHECK THE PROBLEM SOLVING PAGE [HERE](docs/common_problems.md)**
