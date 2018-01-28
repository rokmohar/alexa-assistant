# alexa-assistant

Implementation of the Google Assistant API for Alexa

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

# Upgrade instructions

If you already have a previous version of the skill installed then please read the upgrade instructions here:-

[Upgrade Instructions](upgrade.md)

# New Installation

If you have not installed the skill before then follow the instructions here:-

[Installation Instructions](fresh_install.md)

Otherwise watch Paul Hibberts excellent installation video here:-

ADD LINK WHEN DONE

# CREDITS

Paul Hibbert for producing the installation video.

Richard Vowles for his Typescript based Google Assistant client which gave me some pointers on getting the API running in pure node.js https://github.com/rvowles/node-assistant

John JDuo, Pete Bready and Mark Riley for proof reading previous installation instructions and testing beta versions.

@groky and @prestomation for for their pointers in moving to a CloudFormation deployment of the skills Lambda code







