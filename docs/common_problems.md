# Troubleshooting

Check the logs first. Most problems show up there with a clear error:

```bash
npm run logs
```

You can also open the `/aws/lambda/alexa-assistant-prod-alexa` log group in CloudWatch.

- [Alexa says "There was a problem with the requested skill's response"](#alexa-says-there-was-a-problem-with-the-requested-skills-response)
- [The skill keeps asking me to link my Google account](#the-skill-keeps-asking-me-to-link-my-google-account)
- [Google Assistant says it needs my permission](#google-assistant-says-it-needs-my-permission)
- [Error messages from the skill](#error-messages-from-the-skill)
- [Answers use the wrong location or language](#answers-use-the-wrong-location-or-language)
- [No card on Echo Show or other screen devices](#no-card-on-echo-show-or-other-screen-devices)
- [Still stuck?](#still-stuck)

## Alexa says "There was a problem with the requested skill's response"

Alexa may also say _"Sorry, something went wrong"_ or not find the skill at all. Common causes:

- **The skill's language doesn't match your device.** The skill must have the same locale as your Echo device, for example English (UK) vs English (US). Add the missing locale in the Alexa Developer Console, paste the interaction model JSON for it, and build again.
- **The device is on a different Amazon account.** The skill only works on devices registered to the Amazon account that owns the developer account.
- **Missing environment variables.** If the logs show `Invalid environment variables: ...`, fill in those values in `.env` and redeploy. See [step 5 of the installation guide](serverless_install.md#5-configure-environment-variables).
- **Wrong endpoint.** Check that the skill's endpoint is the ARN of `alexa-assistant-prod-alexa` in the region you deployed to, and that you built the skill after saving it. See [step 7](serverless_install.md#7-connect-the-skill-to-lambda).

## The skill keeps asking me to link my Google account

1. Remove the skill's access to your Google account. Go to [Google account connections](https://myaccount.google.com/connections), select the app (it has the name you gave the OAuth consent screen), and remove access.
2. In the Alexa app, go to **More → Skills & Games → Your Skills → Dev**, open the skill, and **disable** it.
3. Enable the skill again, sign in to Google, and allow every requested permission.

If it still loops, check the setup:

- Your Google account is a **test user** on the OAuth consent screen.
- The Google OAuth client's **Authorized redirect URIs** contain all the Alexa Redirect URLs from the skill's Account Linking page.
- The account linking scopes and URLs match [step 3 of the installation guide](serverless_install.md#3-configure-account-linking).

## Google Assistant says it needs my permission

Google Assistant needs activity tracking turned on for your Google account:

1. Open [Activity controls](https://myaccount.google.com/activitycontrols) for the Google account you linked.
2. Turn on **Web & App Activity**.
3. Under it, tick **Include voice and audio activity** and **Include Chrome history and activity from sites, apps, and devices that use Google services**.

## Error messages from the skill

| Alexa says                                                | What it means and how to fix it                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "You must link your Google account to use this skill"     | Account linking isn't finished. Link the account in the Alexa app (see [above](#the-skill-keeps-asking-me-to-link-my-google-account)).                                                |
| "There was a problem setting up the project"              | Registering the device with Google failed. Check that `GOOGLE_PROJECT_ID` is the Project ID (not its name or number) and that the Google Assistant API is enabled in that project. |
| "The Google API returned an error"                        | Google rejected the request. The logs have the exact gRPC error. `UNAUTHENTICATED` or `PERMISSION_DENIED` usually means relinking the account (see above).                         |
| "I wasn't able to talk to Google - please try again"      | Google didn't answer within 9 seconds. Usually temporary, so try again. If it keeps happening, deploy to a region closer to you.                                                    |
| "I didn't get an audio response from the Google Assistant" | Google answered without audio. Try rephrasing the question.                                                                                                                          |
| "There was an error uploading to S3"                      | The function couldn't upload the answer audio. Check that the `S3_BUCKET` bucket exists in the deployed stack, and look in the logs for the AWS error.                               |

## Answers use the wrong location or language

**Location.** The skill uses the first location it finds, in this order:

1. A location you saved by voice: _"Alexa, ask google to set my location to London"_.
2. Your mobile device's GPS (needs the **Location Services** permission).
3. Your Alexa device's address (needs the **Device Address** permission).
4. The address in your Google profile (needs the People API and the `user.addresses.read` scope).

Ask _"Alexa, ask google what location is saved"_ to see which location it uses. The permissions are explained in [step 1 of the installation guide](serverless_install.md#optional-location-permissions).

**Language.** By default the skill uses your Alexa device's language. To change it, say _"Alexa, ask google to set my language to German"_. To go back to the default, say _"Alexa, ask google to reset my language"_.

## No card on Echo Show or other screen devices

Turn on the **Alexa Presentation Language** interface for the skill, then build it again. See [Show answers on screen devices](serverless_install.md#optional-show-answers-on-screen-devices).

## Still stuck?

[Open a bug report](https://github.com/rokmohar/alexa-assistant/issues/new/choose). Include the relevant log lines, with tokens and IDs removed.
