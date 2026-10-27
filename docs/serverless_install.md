# Installation guide

This guide deploys your own copy of the skill to your AWS account with the [Serverless Framework](https://www.serverless.com/framework/docs). It takes about 30 minutes.

> [!NOTE]
> The skill stays in development mode in your own Amazon account. You never publish it, and only devices on that account can use it.

## Prerequisites

- [Node.js](https://nodejs.org/) 24.x and npm 11+
- An [AWS account](https://aws.amazon.com/) and the [AWS CLI](https://aws.amazon.com/cli/) set up with `aws configure`
- A [Serverless Framework account](https://app.serverless.com/), free for individuals. Serverless v4 asks you to sign in on first use.
- A Google account and a [Google Cloud](https://console.cloud.google.com/) project
- An [Amazon Developer account](https://developer.amazon.com/alexa) on the **same Amazon account as your Echo devices**

## Installation steps

### 1. Create the Alexa skill

1. Open the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) and click **Create Skill**.
2. Name it, for example `Google Assistant for Alexa`. Set the **primary locale to your Echo device's language**, for example English (US).
3. Choose the **Custom** model and **Provision your own** backend hosting, then start from scratch.
4. Copy the **Skill ID** (it starts with `amzn1.ask.skill.`). You need it in steps 5 and 6.
5. Under **Build → Invocations → Skill Invocation Name**, enter `google`.
6. Under **Build → Interaction Model → JSON Editor**, replace everything with the JSON below. Click **Save**, then **Build skill**.

<details>
<summary><strong>Interaction model JSON</strong></summary>

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "google",
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

</details>

> [!TIP]
> If your Echo devices use more than one language, add each locale to the skill and paste the same JSON for each one.

#### Optional: Show answers on screen devices

To show a card with Google's answer on an Echo Show or other screen device, go to **Build → Interfaces**, turn on **Alexa Presentation Language**, then save and rebuild.

#### Optional: Location permissions

The skill can detect your location automatically when you haven't saved one by voice. Under **Build → Permissions**, turn on:

- **Device Address** (Full Address, or Country & Postal Code) to use the address set on your Alexa device.
- **Location Services** to use real-time GPS from mobile Alexa devices.

You can change these permissions at any time.

### 2. Configure Google Cloud

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project or select one. Note its **Project ID**.
2. Under **APIs & Services → Library**, enable the **Google Assistant API**.
   - Optional: also enable the **People API** so the skill can fall back to the address in your Google profile.
3. Set up the **OAuth consent screen**:
   - User type: **External**.
   - App name: anything, for example `Alexa Assistant`. You'll see this name later on Google's sign-in page and in your Google account's connected apps.
   - Add your own Google account as a **test user**. While the app is in testing, only test users can sign in.
4. Under **Credentials → Create credentials → OAuth client ID**, choose **Web application**. You can leave **Authorized redirect URIs** empty for now; you'll add them in step 3.
5. Copy the **Client ID** and **Client secret**.

### 3. Configure account linking

1. In the Alexa Developer Console, open your skill and go to **Build → Account Linking**.
2. Turn on account linking and choose **Auth Code Grant**. Enter these values:

   | Field                         | Value                                                                                                                       |
   | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
   | Web Authorization URI         | `https://accounts.google.com/o/oauth2/auth?access_type=offline`                                                             |
   | Access Token URI              | `https://accounts.google.com/o/oauth2/token`                                                                                |
   | Your Client ID                | Google Client ID from step 2                                                                                                |
   | Your Secret                   | Google Client secret from step 2                                                                                            |
   | Authentication Scheme         | HTTP Basic                                                                                                                  |
   | Scope (add each one)          | `https://www.googleapis.com/auth/assistant-sdk-prototype`<br>`https://www.googleapis.com/auth/script.external_request`      |
   | Domain List (add each one)    | `google.com`<br>`googleapis.com`                                                                                            |

   - Optional: if you enabled the People API, also add the scope `https://www.googleapis.com/auth/user.addresses.read`.

3. Click **Save**.
4. Copy all the **Alexa Redirect URLs** shown on this page. Add them to **Authorized redirect URIs** on your Google OAuth client (step 2.4) and save. They look like this:

   ```text
   https://layla.amazon.com/api/skill/link/<VENDOR_ID>
   https://pitangui.amazon.com/api/skill/link/<VENDOR_ID>
   https://alexa.amazon.co.jp/api/skill/link/<VENDOR_ID>
   ```

### 4. Clone and install

```bash
git clone https://github.com/rokmohar/alexa-assistant.git
cd alexa-assistant
npm install
```

### 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```bash
ALEXA_SKILL_ID=amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GOOGLE_API_ENDPOINT=embeddedassistant.googleapis.com
GOOGLE_PROJECT_ID=your-google-cloud-project-id
S3_BUCKET=your-unique-bucket-name
```

| Variable              | Value                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ALEXA_SKILL_ID`      | Skill ID from step 1                                                                                            |
| `GOOGLE_API_ENDPOINT` | Leave as is                                                                                                     |
| `GOOGLE_PROJECT_ID`   | Project ID from step 2                                                                                          |
| `S3_BUCKET`           | A new bucket name for the audio files. S3 names are global, so pick something unique, e.g. `alexa-assistant-<your-name>` |

### 6. Deploy to AWS

```bash
npm run deploy:prod
```

On the first run, Serverless asks you to sign in or create a free account. The deploy creates the Lambda function `alexa-assistant-prod-alexa`, the S3 bucket, and the DynamoDB table. It also adds the Alexa Skills Kit trigger to the function, restricted to your Skill ID, so you don't need to add a trigger by hand.

> [!TIP]
> The default region is `us-east-1` (North America). For lower latency, deploy closer to your devices: `npm run deploy:prod -- --region eu-west-1` for Europe and India, or `--region us-west-2` for Japan and Australia.

### 7. Connect the skill to Lambda

1. In the [AWS Lambda console](https://console.aws.amazon.com/lambda), open `alexa-assistant-prod-alexa` in the region you deployed to and copy its **Function ARN**.
2. In the Alexa Developer Console, go to **Build → Endpoint**, select **AWS Lambda ARN**, and paste the ARN into **Default Region**.
3. Click **Save**, then build the skill again.

### 8. Link your account and test

1. In the Alexa app, go to **More → Skills & Games → Your Skills → Dev** and open your skill.
2. Tap **Enable to use** and sign in with the Google account you added as a test user.
   - Google warns that it **hasn't verified this app**. That's expected for your own app: click **Continue**.
   - Allow all requested permissions.
3. Say: _"Alexa, ask google what's the weather like"_.

You can also test from the **Test** tab of the Alexa Developer Console (set testing to **Development**).

## Updating

```bash
git pull
npm install
npm run deploy:prod
```

If the [release notes](https://github.com/rokmohar/alexa-assistant/releases) say the interaction model changed, paste the new JSON from step 1 and build the skill again.

## Troubleshooting

- See [Troubleshooting](common_problems.md) for common errors and fixes.
- Stream the Lambda logs with `npm run logs`.

## Additional resources

- [Serverless Framework documentation](https://www.serverless.com/framework/docs)
- [Alexa Skills Kit documentation](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/what-is-the-alexa-skills-kit.html)
- [Alexa account linking](https://developer.amazon.com/en-US/docs/alexa/account-linking/understand-account-linking.html)
- [Google Assistant SDK documentation](https://developers.google.com/assistant/sdk/overview)
