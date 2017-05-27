# alexa-assistant

Google Assistant for Alexa

# Beta 1

# THIS IS AN UNSTABLE DEVELOPMENT BRANCH - PLEASE DO NOT INSTALL THIS VERSION UNLESS HAVE BEEN ASKED TO AS IT IS WORK IN PROGRESS! 

This BETA version contains the following:-

1. First release

### THIS SKILL IS FOR PERSONAL USE ONLY AND IS NOT ENDORSED BY GOOGLE OR AMAZON - DO NOT SUBMIT THIS TO AMAZON FOR CERTIFICATION AS IT WON'T PASS!

This skill is an implementation of the official Google Assistant API wrapped as an Alexa skill. It supports all the functions that the API offers (which is slightly different from the Google Home). It is limited to 500 requests a day and only supports US English (although it is usable in the UK)

The following features are **NOT** supported: -

1. Alarms and timers.
2. Device location. If you have a Home address set in your google account then it will use that as a default
4. Playing music, news, or podcasts is not yet supported.

### PRVIVACY WARNING. IN ORDER FOR THIS SKILL TO WORK THE LAST RESPONSE FROM GOOGLE MUST BE MADE AVAILABLE AS A PUBLICLY ACCESSIBLE MP3 FILE. THIS IS STORED IN AN AWS S3 BUCKET UNDER YOUR CONTROL AND IT IS RECOMMENDED THAT THIS BUCKET IS GIVEN A RANDOMISED NAME TO MINIMISE THE CHANCES OF SOMEONE STUMBLING ON IT. IF THIS IS NOT ACCEPTABLE TO YOU THEN PLEASE DO NOT INSTALL THIS SKILL!!!

## Setup

To run the skill you need to do a number of things: -

1. download the file from github 
2. setup a role in AWS with the correct permissions
3. setup an S3 bucket to store the responses from Google
4. deploy the example code in lambda
5. configure the Alexa skill to use Lambda.
6. get an API key from Google
7. link skill to your Google Account

### Download code from github

1. Click on the green "Clone or download" button just under the yellow bar
2. Click download ZIP
3. Unzip the file to a known place on your hard-drive (suggest root of C: drive in Windows to avoid problems with long filenames)

### AWS Setup

1. Go to http://aws.amazon.com/lambda/ . You will need to set-up an AWS account (the basic one will do fine) if you don't have one already ** Make sure you use the same Amazon account that your Echo device is registered to** Note - you will need a credit or debit card to set up an AWS account - there is no way around this. If you are just using this skill then you are highly unlikely to be charged unless you are making at least a million requests a month!
2.  Go to the drop down "Location" menu at the top right and ensure you select US-East (N. Virginia) if you are based in the US or EU(Ireland) if you are based in the UK or Germany. This is important as only these two regions support Alexa. NOTE: the choice of either US or EU is important as it will affect the results that you get. The EU node will provide answers in metric and will be much more UK focused, whilst the US node will be imperial and more US focused.

### AIM role Setup

1. Select IAM from the Services dropdown menu at the top left.
2. Select Roles from the left hand side
3. Select "Create a new role"
4. Ensure AWS Service Role is selected and then select AWS Lambda in the drop down. This should automatically take you to the next page.
5. Do not select anything on this page and just Click "Next Step"
6. Give the role a name e.g. "google"
7. Give it an optional Role Description if you want to.
8. Click "Create role".
9. Now click on the name of the role you just created.
10. On the next page click on the arrow next to Inline Policies.
Choose the option "There are no inline policies to show. To create one, click here." 
11. On the next page click on "custom policy" and press "Select".
12. Give the policy a name ("googleskill")
13. Paste the following into the "Policy Document" box:

    ```
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                "Resource": [
                    "arn:aws:logs:*:*:*",
                    "arn:aws:lambda:*:*:*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "polly:SynthesizeSpeech"
                ],
                "Resource": [
                    "*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": "s3:*",
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": "dynamodb:*",
                "Resource": "*"
            }
        ]
    }
    ```

14. Click on "Apply Policy"


### Create a new S3 bucket

1. Select S3 from the AWS Services menu at the top left
2. Click on "Create Bucket"
3. Give your bucket a unique name - Amazon will tell you if it isn't. As the responses from the Google Assistant will be stored here and need to be public. I suggest using a random string generator. This link will generate one for you: - https://www.random.org/strings/?num=1&len=20&digits=on&loweralpha=on&unique=on&format=html&rnd=new.
4. Make a note of this name (Hint - notepad is good for this) - you will need it later.
5. Use the same region as you will be running your Alexa skill (EU (Ireland) or North Virginia)
6. Ignore the copy Settings option
7. Click "Create"
8. Select the bucket that you just created.
9. Click on "Create folder" - call it "mp3" and then hit "Save"
10. Click on the mp3 folder to open it.
11. Press "Upload", select "Add files" and select "chime.mp3" from the github zip
12. Click "Upload" at the bottom left (ignore the next option)
13. Select the checkbox next to chime.mp3. Then click on the "More" dropdown and click on "Make public". Click "Make public" on the blue pop-up box.


### AWS Lambda Setup (Part 1)

1. Select Lambda from the AWS Services menu at the top left
2. Click on the Create a Lambda Function or Get Started Now button.
3. Skip the Select Blueprint Tab and just click on the "Configure Triggers" Option on the left hand side
4. On the Cofigure Triggers tab Click the dotted box and select "Alexa Skills Kit". Click Next
5. Name the Lambda Function "google".
6. Select the default runtime node.js 6.10.
7. Select Code entry type as "Upload a .ZIP file". Go to the folder where you unzipped the files you downloaded from Github. Open the src folder, select index.zip and click open. Do not upload the zip file you downloaded from github - only the index.zip contained within it

8. Enter the following into the Environment Variables Section: -

|Key           | Value|
|--------------| -----|
|S3_BUCKET|(put the name of the S3 bucket you created in here)|
|CLIENT_SECRET|(leave blank for the momment)|
|CLIENT_ID |(leave blank for the momment)|
|API_ENDPOINT|embeddedassistant.googleapis.com|
|REDIRECT_URL|(leave blank for the momment)|


9. Keep the Handler as index.handler (this refers to the main js file in the zip).
10. Role should be "Choose an existing role"
11. Under Existing Role - pick the IAM role you created earlier
12. Under Advanced settings set Memory (MB) to 1536 and change the Timeout to 10 seconds
13. Click "Next" and review the settings then click "Create Function". This will upload the Archive.zip file to Lambda. This may take a number of minutes depending on your connection speed
14. Copy the ARN from the top right to be used later in the Alexa Skill Setup (it's the text after ARN - it won't be in bold and will look a bit like this arn:aws:lambda:eu-west-1:XXXXXXX:function:google). Hint - Paste it into notepad or similar.
15. Leave this window **open** as we will need to return to it to set some further environment variable values.

### Alexa Skill Setup (Part 1)

1. In a new browser window go to the Alexa Console (https://developer.amazon.com/edw/home.html and select Alexa on the top menu)
2. Click "Get Started" under Alexa Skills Kit
3. Click the "Add a New Skill" yellow box.
4. You will now be on the "Skill Information" page.
5. Set "Custom Interaction Model" as the Skill type
6. Select the language as English (US), English (UK), or German depending on your location
7. Set "google" as the skill name and "google" as the invocation name, this is what is used to activate your skill. For example you would say: "Alexa, Ask google who is the queen of england." (NOTE - if you have already used the Google name for the previous google skill then you will need to rename the old one or delete it)
8. Leave the "Audio Player" setting to "No"
9. Click Next.
10. You will now be on the "Inovation Model" page.
11. Copy the text below into the "Intent Schema" box.

    ```
    {
      "intents": [
        {
          "intent": "AMAZON.StopIntent"
        },
        {
          "intent": "AMAZON.CancelIntent"
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

12. Under Custom Slot Types:-
13. Type "SEARCH" into the "Enter Type" field
14. Paste the text below into the "Enter Values" box

    ```
    who is the queen
    why is the sky blue
    ```

15. Copy the text below amd paste them into the Sample Uterances box.

    ```
    SearchIntent {search}
    ```
16. Click Next.
17. You will now be on the "Configuration" page.
18. Select "AWS Lambda ARN (Amazon Resource Name)" for the skill Endpoint Type.
19. Then pick the most appropriate geographical region (either US or EU as appropriate) and paste the ARN you copied in step 13 from the AWS Lambda setup.
20. Select Yes for Account Linking

At this point we will pause the setup of the skill and setup the google API. Copy the two Redirect URLs lower down the page (one will start with https://layla.amazon.com/api/skill/link the other https://pitangui.amazon.com/api/skill/link). We will need these during the setup of the Google API.

**Leave this page open**

### Enable Google Assistant API:-
To enable access to the Google Assistant API, do the following:

1. In a new browser window, go to the Cloud Platform Console here https://console.cloud.google.com/project
and then to the Projects page.
2. Click on "Create Project"
3. Give the project a name, it doesn't really matter what it is but it needs to be unique so google will add a series of numbers to the end of the name if somebody has alreday used it. Press create.
4. Click on the name of the project that you just created. This will take you to an IAM & ADMIN page. Do nothing with this page.
5. Click on this link: - https://console.developers.google.com/apis/api/embeddedassistant.googleapis.com/overview
This will take you to a page entitled API manager.
6. Click on the blue text near the top that says "ENABLE".
7. Once the next page had loaded - do nothing with this page.
8. Click on this link:- 
https://console.developers.google.com/apis/credentials/oauthclient

9. You may need to set a product name for the product consent screen. On the OAuth consent screen tab, give the product a name (pick anything you want) and click Save.
10. Click Web application and set the name to "google_assistant"
Under Authorised redirect URIs, paste the first of the "Redirect URLS" from the skill setup page and hit "Enter"
11. A second box will appear - into this paste the second "Redirect URL" and then hit "Enter" again
12. Click Create. A dialog box appears that shows you a client ID and secret. Make a note of these (Copy these into a notepad document or similar) as we'll need to enter these into our skill and Lambda function later.
13. Hit OK. You can now close this page.


### Alexa Skill Setup (Part 2)

1. Return to the Alexa skill page that we paused at earlier
2. In the Authorization URL paste the following: -

    ```
    https://accounts.google.com/o/oauth2/auth?access_type=offline
    ```
    
3. Into the Client ID box, paste the Client ID that we got from google in the previous step.
4. Under Domain List : Press "Add domain" and enter:-

    ```
    google.com
    ```

5. Press "add domain" again for a second box into which enter:-

    ```
    googleapis.com
    ```

6. Under Scope: Press "Add Scope" and enter:-

    ```
    https://www.googleapis.com/auth/assistant-sdk-prototype
    ```
    
7. Press "add scope" again for a second box into which enter:-
    ```
    https://www.googleapis.com/auth/script.external_request
    ```

8. Under Authorisation Grant Type make sure "Auth Code Grant" is selected.
9. The Access Token URI should be set to: -
    
    ```
    https://accounts.google.com/o/oauth2/token
    ```

10. Paste in the Client Secret that you were given by Google previously
11. Leave Client Authentication Scheme as "HTTP Basic"
12. Leave eveytthing under Permission unslected.
13. Paste into the Privacy Policy URL box: -

    ```
    https://www.google.com/policies/privacy/
    ```
    

14. Click Next.
15. There is no need to go any further through the process i.e. submitting for certification. There is no point in testing the skill on the next page as the simulator cannot athenticate against the Google API.


### AWS Lambda Setup (Part 1)

1. Return to the Lambda Function page we left open earlier.
2. Click on the lambda function "Code" tab (it will probably be alreday open on the Triggers tab)
3. Paste the google Client Secret into the value field for the CLIENT_SECRET variable.
4. Paste the google Client ID into the value field for the CLIENT_ID variable.
5. Paste the first of the "Redirect URLS" from the skill setup page into the REDIRECT_URL variable.
6. Hit "Save" at the top (Not "Save and Test")


### Linking the skill to your Google Account

1. In order to use the Google Assistant, you must share certain activity data with Google. The Google Assistant needs this data to function properly; this is not specific to the SDK.

2. Open the Activity Controls page https://myaccount.google.com/activitycontrols for the Google account that you want to use with the Assistant. Ensure the following toggle switches are enabled (blue):

    Web & App Activity
    Location History
    Device Information
    Voice & Audio Activity
    
3. Launch the Google skill by asking "Alexa, open Google"
4. You will then be prompted to link your account through the Alexa app.


