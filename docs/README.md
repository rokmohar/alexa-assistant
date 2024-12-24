# alexa-assistant-instructions

These are the instructions for installing the Alexa Asistant Skill found here:-

https://github.com/rokmohar/alexa-assistant

# Licence for Cloud Formation based installation instructions

The instruction files in this github project and the CloudFormation template linked to in these instructions (provided for users installing the lambda function) are licenced under a [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](http://creativecommons.org/licenses/by-nc-nd/4.0/)

If you wish to reproduce the installation instructions hosted on your own website (**I really wish you wouldn't as it makes my life very difficult to support and update the skill**) then you may do so and link to my Cloudformation template (and consequently the zips on my S3 buckets)  provided that there is no monetisation on the page e.g. adverts. If you do wish to have monetisation then you will need to create your own instructions and host your own Cloudformation template and associated zip files. 

I AM VERY SERIOUS ABOUT THIS POINT - I WILL BE CHECKING FREQUENTLY AND WILL CHANGE OR REMOVE THE CLOUDFORMATION TEMPLATE URL IF PEOPLE ARE ABUSING IT

NOTE: I have granted Paul Hibbert the rights to link to the Cloudformation for the purposes of his installation videos

# Upgrade instructions

If you already have a previous version of the skill installed then please read the upgrade instructions here:-

[Upgrade Instructions](upgrade.md)

# New Installation via CloudFormation 

This is the easiest method as it creates the lambda function automatically for you.

NOTE - PLEASE ONLY USE THE CLOUDFORMATION TEMPLATE URL PROVIDED IN THE INSTRUCTIONS ON THIS GITHUB SITE OR PAUL HIBBERTS VIDEO. 
I CANNOT GUARANTEE THE SAFETY OF URLS GIVEN ON OTHER SITES

If you have not installed the skill before then follow the instructions here:-

[Installation Instructions](fresh_install.md)

# CREDITS

Paul Hibbert for producing the installation video.

Richard Vowles for his Typescript based Google Assistant client which gave me some pointers on getting the API running in pure node.js https://github.com/rvowles/node-assistant

John JDuo, Pete Bready and Mark Riley for proof reading previous installation instructions and testing beta versions.

@groky and @prestomation for for their pointers in moving to a CloudFormation deployment of the skills Lambda code
