# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Download Release

You can download the ZIP file from the [Releases](https://github.com/rokmohar/alexa-assistant/releases)
page and upload them to the AWS Lambda function from the AWS console.

# Installation

Follow the installation instructions here:

[Installation Instructions](docs/serverless_install.md)

## Build from Docker

Run the following commands:

`docker build -t mylambda .`

You can copy ZIP archive file from the Docker image to your host machine with the command:

`docker run --rm --entrypoint cat mylambda ./lambda.zip > ./lambda.zip`

# IT DOESN'T WORK / PROBLEM SOLVING

**BEFORE RAISING A QUESTION PLEASE CHECK THE PROBLEM SOLVING PAGE [HERE](docs/common_problems.md)**
