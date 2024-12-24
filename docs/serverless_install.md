# Simplified Installation Guide

This guide will help you set up and deploy the Alexa Assistant skill using the Serverless Framework.

## Prerequisites

1. Node.js 20.x or later
2. AWS CLI configured with appropriate credentials
3. Google Cloud Platform account with Google Assistant API enabled
4. Alexa Developer account

## Installation Steps

### 1. Create Alexa Skill

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa)
2. Create a new skill
3. Note down your Skill ID for later use
4. Configure the skill with the following settings:
   - Invocation Name: "google assistant" (or your preferred name)
5. Go to "Interaction Model" configuration
   - Click on "JSON Editor" in the top right corner
   - Replace the entire content with the following JSON:
     ```json
     {
       "interactionModel": {
         "languageModel": {
           "invocationName": "google assistant",
           "intents": [
             {
               "name": "AMAZON.NavigateSettingsIntent",
               "samples": []
             },
             {
               "name": "AMAZON.MoreIntent",
               "samples": []
             },
             {
               "name": "AMAZON.PageDownIntent",
               "samples": []
             },
             {
               "name": "AMAZON.PageUpIntent",
               "samples": []
             },
             {
               "name": "AMAZON.ScrollRightIntent",
               "samples": []
             },
             {
               "name": "AMAZON.ScrollDownIntent",
               "samples": []
             },
             {
               "name": "AMAZON.ScrollLeftIntent",
               "samples": []
             },
             {
               "name": "AMAZON.ScrollUpIntent",
               "samples": []
             },
             {
               "name": "AMAZON.HelpIntent",
               "samples": []
             },
             {
               "name": "AMAZON.NextIntent",
               "samples": []
             },
             {
               "name": "AMAZON.PreviousIntent",
               "samples": []
             },
             {
               "name": "AMAZON.StopIntent",
               "samples": []
             },
             {
               "name": "AMAZON.CancelIntent",
               "samples": []
             },
             {
               "name": "AMAZON.NoIntent",
               "samples": []
             },
             {
               "name": "AMAZON.YesIntent",
               "samples": []
             },
             {
               "name": "SearchIntent",
               "slots": [
                 {
                   "name": "search",
                   "type": "SEARCH"
                 }
               ],
               "samples": [
                 "{search}"
               ]
             }
           ],
           "types": [
             {
               "name": "SEARCH",
               "values": [
                 {
                   "name": {
                     "value": "who is the queen"
                   }
                 },
                 {
                   "name": {
                     "value": "why is the sky blue"
                   }
                 }
               ]
             }
           ]
         }
       }
     }
     ```
   - Click "Save Model" and then "Build Model"

### 2. Configure Google Assistant API

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Assistant API
4. Create OAuth 2.0 credentials
5. Configure OAuth consent screen:
  - Go to "OAuth consent screen" in the left menu
  - Add the following redirect URIs:
    - `https://layla.amazon.com/api/skill/link/[YOUR_SKILL_ID]`
    - `https://pitangui.amazon.com/api/skill/link/[YOUR_SKILL_ID]`
    - `https://alexa.amazon.co.jp/api/skill/link/[YOUR_SKILL_ID]`
  - Replace `[YOUR_SKILL_ID]` with your Alexa Skill ID
6. Note down your Google Client ID and Client Secret - you'll need these for the next step

### 3. Configure Alexa Skill Account Linking

Now that you have your Google Client ID and Secret, go back to the Alexa Developer Console and configure Account Linking:

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa)
2. Find your skill in the list and click "Edit"
3. Go to "Account Linking" configuration
   - Authorization URL: `https://accounts.google.com/o/oauth2/auth?access_type=offline`
   - Access Token URI: `https://accounts.google.com/o/oauth2/token`
   - Client ID: Your Google Client ID (from previous step)
   - Client Secret: Your Google Client Secret (from previous step)
   - Client Authentication Scheme: HTTP Basic
   - Scope: 
     - `https://www.googleapis.com/auth/assistant-sdk-prototype`
     - `https://www.googleapis.com/auth/script.external_request`
   - Domain List: 
     - `google.com`
     - `googleapis.com`

### 4. Configure Lambda Trigger

1. Go to the [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Find your deployed function (it should be named something like `alexa-assistant-prod-alexa`)
3. Click on "Add trigger"
4. Select "Alexa Skills Kit" as the trigger
5. Enter your Alexa Skill ID (you can find this in the Alexa Developer Console)
6. Click "Add" to create the trigger

### 5. Configure Alexa Skill Endpoint

1. Go back to the [Alexa Developer Console](https://developer.amazon.com/alexa)
2. In the skill builder, go to "Endpoint" configuration
3. Select "AWS Lambda ARN" as the service endpoint type
4. Paste the Lambda ARN from your deployment output into the "Default Region" field

### 6. Clone and Install Dependencies

First, clone the repository:
```bash
git clone https://github.com/rokmohar/alexa-assistant.git
```

Then, navigate to the project directory:
```bash
cd alexa-assistant
```

Finally, install the project dependencies:
```bash
npm install
```

### 7. Configure Environment Variables

Copy the example environment file and adjust the values:

```bash
cp .env.example .env
```

Then edit the `.env` file with your configuration:

```bash
API_ENDPOINT=embeddedassistant.googleapis.com
DEVICE_LOCATION=your_device_location
PROJECT_ID=your_google_cloud_project_id
```

Note: Replace the placeholder values with your actual configuration:
- `DEVICE_LOCATION`: Your device's location: lat, long
- `PROJECT_ID`: Your Google Cloud Project ID

### 8. Deploy to AWS

Deploy to production in `us-east-1` region:

```bash
npm run deploy:prod -- --region us-east-1
```

### 9. Test Your Skill

1. Open the Alexa app on your device
2. Enable the skill
3. Link your Google account
4. Test the skill by saying "Alexa, ask google [your question]"

## Troubleshooting

- Check the logs: `npm run logs`
- Test locally: `npm run test`
- Verify AWS credentials: `aws configure list`
- Check Google API status: [Google Cloud Console](https://console.cloud.google.com)

## Additional Resources

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/what-is-the-alexa-skills-kit.html)
- [Google Assistant API Documentation](https://developers.google.com/assistant/sdk/overview) 
