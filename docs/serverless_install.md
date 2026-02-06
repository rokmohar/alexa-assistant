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
               "name": "AMAZON.HelpIntent",
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
             },
             {
               "name": "SetLocationIntent",
               "slots": [
                 {
                   "name": "address",
                   "type": "AMAZON.City"
                 }
               ],
               "samples": [
                 "set my location to {address}",
                 "save my location as {address}",
                 "change my location to {address}"
               ]
             },
             {
               "name": "GetLocationIntent",
               "slots": [],
               "samples": [
                 "get my saved location",
                 "what location is saved",
                 "what location setting do I have"
               ]
             },
             {
               "name": "ClearLocationIntent",
               "slots": [],
               "samples": [
                 "clear my location",
                 "delete my saved location",
                 "remove my location setting"
               ]
             },
             {
               "name": "SetLanguageIntent",
               "slots": [
                 {
                   "name": "language",
                   "type": "AMAZON.Language"
                 }
               ],
               "samples": [
                 "set my language to {language}",
                 "change my language to {language}",
                 "set language to {language}"
               ]
             },
             {
               "name": "GetLanguageIntent",
               "slots": [],
               "samples": [
                 "get my language setting",
                 "what language setting do I have",
                 "what language is set"
               ]
             },
             {
               "name": "ClearLanguageIntent",
               "slots": [],
               "samples": [
                 "clear my language",
                 "reset my language",
                 "remove my language setting"
               ]
             }
           ],
           "types": [
             {
               "name": "SEARCH",
               "values": [
                 { "name": { "value": "what time is it" } },
                 { "name": { "value": "what is the weather" } },
                 { "name": { "value": "who is the president of the united states" } },
                 { "name": { "value": "how far is the moon" } },
                 { "name": { "value": "tell me a joke" } },
                 { "name": { "value": "what is the capital of france" } },
                 { "name": { "value": "how do you say hello in spanish" } },
                 { "name": { "value": "when was the eiffel tower built" } },
                 { "name": { "value": "what is the population of japan" } },
                 { "name": { "value": "how tall is mount everest" } },
                 { "name": { "value": "who invented the telephone" } },
                 { "name": { "value": "what is the speed of light" } },
                 { "name": { "value": "play some music" } },
                 { "name": { "value": "set a timer for five minutes" } },
                 { "name": { "value": "what are the latest news" } },
                 { "name": { "value": "how do I make pancakes" } },
                 { "name": { "value": "where is the nearest gas station" } },
                 { "name": { "value": "who won the world cup" } },
                 { "name": { "value": "what is two plus two" } },
                 { "name": { "value": "why is the sky blue" } },
                 { "name": { "value": "what day is it today" } },
                 { "name": { "value": "how old is the earth" } },
                 { "name": { "value": "what is the meaning of life" } },
                 { "name": { "value": "who wrote romeo and juliet" } },
                 { "name": { "value": "how many miles in a kilometer" } },
                 { "name": { "value": "what is the largest ocean" } },
                 { "name": { "value": "when is christmas" } },
                 { "name": { "value": "how do you spell necessary" } },
                 { "name": { "value": "what is the boiling point of water" } },
                 { "name": { "value": "who painted the mona lisa" } },
                 { "name": { "value": "where is the great wall of china" } },
                 { "name": { "value": "how many planets are in the solar system" } },
                 { "name": { "value": "what is the longest river in the world" } },
                 { "name": { "value": "who discovered gravity" } },
                 { "name": { "value": "what language do they speak in brazil" } },
                 { "name": { "value": "how far is the sun from earth" } },
                 { "name": { "value": "what is the square root of 144" } },
                 { "name": { "value": "when did world war two end" } },
                 { "name": { "value": "how many ounces in a pound" } },
                 { "name": { "value": "what is the tallest building in the world" } },
                 { "name": { "value": "who is the richest person in the world" } },
                 { "name": { "value": "what is the currency of japan" } },
                 { "name": { "value": "how do you convert celsius to fahrenheit" } },
                 { "name": { "value": "what are the symptoms of the flu" } },
                 { "name": { "value": "who directed jurassic park" } },
                 { "name": { "value": "what is the fastest animal on earth" } },
                 { "name": { "value": "how many continents are there" } },
                 { "name": { "value": "what is the chemical formula for water" } },
                 { "name": { "value": "when was the internet invented" } },
                 { "name": { "value": "where is the amazon rainforest" } },
                 { "name": { "value": "how much does an elephant weigh" } },
                 { "name": { "value": "what is the national anthem of germany" } },
                 { "name": { "value": "who won the last super bowl" } },
                 { "name": { "value": "how do you make scrambled eggs" } },
                 { "name": { "value": "what is the distance from new york to london" } },
                 { "name": { "value": "tell me a fun fact" } },
                 { "name": { "value": "what movies are playing near me" } },
                 { "name": { "value": "how do I fix a leaky faucet" } },
                 { "name": { "value": "what is the stock price of apple" } },
                 { "name": { "value": "who sings bohemian rhapsody" } },
                 { "name": { "value": "what is the weather forecast for tomorrow" } },
                 { "name": { "value": "how many calories in a banana" } },
                 { "name": { "value": "what is the definition of empathy" } },
                 { "name": { "value": "when is the next full moon" } },
                 { "name": { "value": "where was pizza invented" } },
                 { "name": { "value": "how long does it take to fly to tokyo" } },
                 { "name": { "value": "what is the smallest country in the world" } },
                 { "name": { "value": "who discovered america" } },
                 { "name": { "value": "how do you say thank you in french" } },
                 { "name": { "value": "what is the deepest ocean trench" } },
                 { "name": { "value": "when was the first iphone released" } },
                 { "name": { "value": "how many teaspoons in a tablespoon" } },
                 { "name": { "value": "what is the most spoken language in the world" } },
                 { "name": { "value": "who built the pyramids" } },
                 { "name": { "value": "what is the freezing point of water in fahrenheit" } },
                 { "name": { "value": "where do penguins live" } },
                 { "name": { "value": "how old is the universe" } },
                 { "name": { "value": "what is the largest desert in the world" } },
                 { "name": { "value": "who invented the light bulb" } },
                 { "name": { "value": "what are the seven wonders of the world" } },
                 { "name": { "value": "how do you tie a tie" } },
                 { "name": { "value": "what is the circumference of the earth" } },
                 { "name": { "value": "when is daylight saving time" } },
                 { "name": { "value": "remind me to buy groceries" } },
                 { "name": { "value": "what is trending on twitter" } },
                 { "name": { "value": "how do I get to the airport" } },
                 { "name": { "value": "what is the recipe for chocolate cake" } },
                 { "name": { "value": "who is the author of harry potter" } },
                 { "name": { "value": "what is the ph of lemon juice" } },
                 { "name": { "value": "how many bones are in the human body" } },
                 { "name": { "value": "when was the declaration of independence signed" } },
                 { "name": { "value": "where is mount kilimanjaro" } },
                 { "name": { "value": "what is the speed of sound" } },
                 { "name": { "value": "how do magnets work" } },
                 { "name": { "value": "what is the biggest animal ever" } },
                 { "name": { "value": "who invented the airplane" } },
                 { "name": { "value": "what is fifteen percent of two hundred" } },
                 { "name": { "value": "how many liters in a gallon" } },
                 { "name": { "value": "what year did the titanic sink" } },
                 { "name": { "value": "sing me a song" } },
                 { "name": { "value": "good morning" } }
               ]
             }
           ]
         }
       }
     }
     ```
   - Click "Save Model" and then "Build Model"

#### Optional: Configure Language Preference

You can set your preferred language for Google Assistant responses using voice commands:

- **Set language**: "Alexa, ask google to set my language to German"
- **Check language**: "Alexa, ask google what is my language"
- **Clear language**: "Alexa, ask google to clear my language"

Supported languages include: English, British English, German, Australian English, Canadian English, Canadian French, Indian English, Japanese, French, Spanish, Italian, Korean, and Portuguese. You can also use locale codes directly (e.g., "en-GB", "de-DE").

If no language preference is set, the skill will use the default language from your Alexa device.

#### Optional: Configure Location Permissions

If you want the skill to automatically detect your location (as a fallback when you haven't set one manually):

1. Go to "Permissions" in the left menu under "Build"
2. Enable **Device Address** (Full Address or Country & Postal Code) to use your Alexa device's configured address
3. Enable **Location Services** to access real-time GPS from mobile Alexa devices

Note: These permissions are optional and can be configured at any time.

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

### 4. Clone and Install Dependencies

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

### 5. Configure Environment Variables

Copy the example environment file and adjust the values:

```bash
cp .env.example .env
```

Then edit the `.env` file with your configuration:

```bash
ALEXA_SKILL_ID=your_alexa_skill_id
GOOGLE_API_ENDPOINT=embeddedassistant.googleapis.com
GOOGLE_PROJECT_ID=your_google_cloud_project_id
S3_BUCKET=your_bucket_name
```

Note: Replace the placeholder values with your actual configuration:
- `ALEXA_SKILL_ID`: Your Alexa Skill ID
- `GOOGLE_PROJECT_ID`: Your Google Cloud Project ID
- `S3_BUCKET`: Your desired bucket name

### 6. Deploy to AWS

Deploy to production in `us-east-1` region:

```bash
npm run deploy:prod -- --region us-east-1
```

### 7. Configure Lambda Trigger

1. Go to the [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Find your deployed function
3. Click on "Add trigger"
4. Select "Alexa Skills Kit" as the trigger
5. Enter your Alexa Skill ID (you can find this in the Alexa Developer Console)
6. Click "Add" to create the trigger

### 8. Configure Alexa Skill Endpoint

1. Go back to the [Alexa Developer Console](https://developer.amazon.com/alexa)
2. In the skill builder, go to "Endpoint" configuration
3. Select "AWS Lambda ARN" as the service endpoint type
4. Paste the Lambda ARN from your deployment output into the "Default Region" field

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
