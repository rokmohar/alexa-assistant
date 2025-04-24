# Simplified Installation Guide

This guide will help you set up and deploy the Alexa Assistant skill using the Serverless Framework.

## Prerequisites

1. Node.js 20.x or later
2. AWS CLI configured with appropriate credentials
3. Google Cloud Platform account with Google Assistant API enabled
4. Alexa Developer account

## Installation Steps

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/rokmohar/alexa-assistant.git
cd alexa-assistant
yarn install
```

### 2. Configure Google Assistant API

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Assistant API
4. Create OAuth 2.0 credentials
5. Download the client secret file and rename it to `client_secret.json`

### 3. Configure Environment Variables

Copy the example environment file and adjust the values:

```bash
cp .env.example .env
```

Then edit the `.env` file with your configuration:

```bash
API_ENDPOINT=embeddedassistant.googleapis.com
DEVICE_LOCATION=your_device_location
PROJECT_ID=your_google_cloud_project_id
S3_BUCKET=your_aws_s3_bucket_name
```

Note: Replace the placeholder values with your actual configuration:
- `DEVICE_LOCATION`: Your device's location (e.g., "en-US")
- `PROJECT_ID`: Your Google Cloud Project ID
- `S3_BUCKET`: Your AWS S3 bucket name for storing session data

### 4. Local Development

Start the local development server:

```bash
yarn start
```

This will start the serverless offline server, allowing you to test your skill locally.

### 5. Deploy to AWS

Deploy to production:

```bash
yarn deploy:prod
```

Deploy to development environment:

```bash
yarn deploy
```

### 6. Configure Alexa Skill

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa)
2. Create a new skill
3. Use the skill ID from the deployment output
4. Configure the skill with the following settings:
   - Invocation Name: "google" (or your preferred name)
   - Account Linking: Enabled
   - Authorization URL: `https://accounts.google.com/o/oauth2/auth?access_type=offline`
   - Client ID: Your Google Client ID
   - Client Secret: Your Google Client Secret
   - Authorization Grant Type: Auth Code Grant
   - Access Token URI: `https://accounts.google.com/o/oauth2/token`
   - Client Authentication Scheme: HTTP Basic
   - Scopes: 
     - `https://www.googleapis.com/auth/assistant-sdk-prototype`
     - `https://www.googleapis.com/auth/script.external_request`

### 7. Test Your Skill

1. Open the Alexa app on your device
2. Enable the skill
3. Link your Google account
4. Test the skill by saying "Alexa, ask google [your question]"

## Troubleshooting

- Check the logs: `yarn logs`
- Test locally: `yarn test`
- Verify AWS credentials: `aws configure list`
- Check Google API status: [Google Cloud Console](https://console.cloud.google.com)

## Additional Resources

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/what-is-the-alexa-skills-kit.html)
- [Google Assistant API Documentation](https://developers.google.com/assistant/sdk/overview) 