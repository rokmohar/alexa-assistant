# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Beta Release 2.05

Supports the new Assistant SDK
Adds support for languages other than US English
Adds suppurt for Echo Show


### THIS SKILL IS FOR PERSONAL USE ONLY AND IS NOT ENDORSED BY GOOGLE OR AMAZON. WHILST THIS SKILL USES AN OFFICIAL GOOGLE API, IT WILL NEVER PASS AMAZON CERTIFICATION DUE TO THE WAY THE RESPONSES ARE HOSTED.

This is a beta release for testing and is only available as an upgrade to the existing version at this time.


You must already have the skill installed. Inorder to upgarde to thus version you will need  to:-

1. Upload the new index.zip to your lambda function
2. Create a new lambda function environment variable called "PROJECT_ID". The value of this environment variable must be the name of the Google Project that you created in the API console. You can get to your project via this link: 

https://console.cloud.google.com/cloud-resource-manager

3. Go to the Alexa developer console 

https://developer.amazon.com/edw/home.html

4. Select the Google Assistant Skill
5. Go to the Skill Information tab make sure "Render Template is set to Yes"
6. On the Interaction Model, replace the existing Intent Schema with this:
    ```
    {
      "intents": [
        {
          "intent": "AMAZON.NavigateSettingsIntent"
        },
        {
          "intent": "AMAZON.MoreIntent"
        },
        {
          "intent": "AMAZON.PageDownIntent"
        },
        {
          "intent": "AMAZON.PageUpIntent"
        },
        {
          "intent": "AMAZON.ScrollRightIntent"
        },
        {
          "intent": "AMAZON.ScrollDownIntent"
        },
        {
          "intent": "AMAZON.ScrollLeftIntent"
        },
        {
          "intent": "AMAZON.ScrollUpIntent"
        },
        {
          "intent": "AMAZON.HelpIntent"
        },
        {
          "intent": "AMAZON.NextIntent"
        },
        {
          "intent": "AMAZON.PreviousIntent"
        },
        {
          "intent": "AMAZON.StopIntent"
        },
        {
          "intent": "AMAZON.CancelIntent"
        },
        {
          "intent": "AMAZON.NoIntent"
        },
        {
          "intent": "AMAZON.YesIntent"
        },
        {
          "slots": [
            {
              "name": "search",
              "type": "SEARCH"
            }
          ],
          "intent": "SearchIntent"
        }
      ]
    }
    ```
    
7. Leave the custom slots and sample utterance as per the previous version.
8. Click Save and then next once it has processed

9. Open the skill once by asking 'Alexa Open Google' (or whatever you have called the skill). This may take some time as it needs to do some on-time setup in the background. If it all works then the skill will respond in US English.
10. To change the language to UK English and set your location you will need to have the very latest version of Google Assistant installed on your iOS or Android phone. Follow these instructions to set the language to German (the skill will be listed as "Alexa Assistant v1" in the devices section of settings):

https://developers.google.com/assistant/sdk/guides/assistant-settings

12. You will probably want to turn on the person results option in the Assistant App as well
11. You should be good to go if not raise an issue
