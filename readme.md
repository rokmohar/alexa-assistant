# alexa-assistant

Implementation of the Google Assistant API for Alexa

![alt text](screenshots/alexa_assistant.jpg)

# Beta Release 2.1

### THIS SKILL IS FOR PERSONAL USE ONLY AND IS NOT ENDORSED BY GOOGLE OR AMAZON. WHILST THIS SKILL USES AN OFFICIAL GOOGLE API, IT WILL NEVER PASS AMAZON CERTIFICATION DUE TO THE WAY THE RESPONSES ARE HOSTED.

This is a beta release for testing 

# What's New in this release

1. Supports latest Google Assistant API
2. No longer uses Amazon Polly so should be completely free to use within the Free AWS Tier
3. Supports languages other than US English via configuration in Google Assistant mobile app
4. Supports localisation, again via Google Assistant mobile app
5. Added support for devices with screen like the Show and Spot - this will display text responses when available
6. Lambda function is now deployed via a hosted cloudformation config. This means you don't need to download the skill code from github and most of the settings are automatically configured. It should make upgrading the skill easier in the future

# Why do I need a credit card?

The skill is hosted on AWS which is an Amazon service. The usage of this skill is free for many thousands of requests however Amazon still require a credit card incase you start using their services beyond the free limits. Your credit card details stay with Amazon - neither I nor any other developers can access them.

There is no way around this. If you don't want to give your credit card details to Amazon then you cannot install and run this skill - sorry

# Upgrade instructions

If you already have a previous version of the skill installed then please read the upgrade instructions here:-

[Upgrade Instructions](upgrade.md)

# New Installation via CloudFormation 

This is the easiest method as it creates the lambda function automatically for you.
NOTE - PLEASE ONLY USE THE CLOUDFORMATION TEMPLATE URL PROVIDED IN THE INSTRUCTIONS ON THIS SITE OR PAUL HIBBERTS VIDEO. 
I CANNOT GUARANTEE THE SAFETY OF URLS GIVEN ON OTHER SITES

If you have not installed the skill before then follow the instructions here:-

[Installation Instructions](fresh_install.md)

Otherwise watch Paul Hibberts excellent installation video here:-

ADD LINK WHEN DONE

# CREDITS

Paul Hibbert for producing the installation video.

Richard Vowles for his Typescript based Google Assistant client which gave me some pointers on getting the API running in pure node.js https://github.com/rvowles/node-assistant

John JDuo, Pete Bready and Mark Riley for proof reading previous installation instructions and testing beta versions.

@groky and @prestomation for for their pointers in moving to a CloudFormation deployment of the skills Lambda code







