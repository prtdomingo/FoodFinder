'use strict';

const builder = require('botbuilder');
const restify = require('restify');
const cognitiveServices = require('botbuilder-cognitiveservices');
const needle = require('needle');
const customVisionService = require('./customVisionService.js');

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`${server.name} listening to ${server.url}`);
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

const bot = new builder.UniversalBot(connector);

const recognizer = new cognitiveServices.QnAMakerRecognizer({
    knowledgeBaseId: 'bdca3e39-521e-45ef-a488-0fe59cc3aa1b',
    subscriptionKey: 'b096ae3292f048b8a4292acf0163f138'
});

const qnaMakerDialog = new cognitiveServices.QnAMakerDialog({
    recognizers: [recognizer],
    defaultMessage: 'Sorry, no match found!',
    qnaThreshold: 0.3
});

// default dialog
bot.dialog('/', function(session){
    session.sendTyping();
    
    if (hasImageAttachment(session)) {
        var stream = getImageStreamFromMessage(session.message);
        customVisionService.predict(stream)
            .then(function (response) {
                // Convert buffer into string then parse the JSON string to object
                var jsonObj = JSON.parse(response.toString('utf8'));
                console.log(`Response: ${jsonObj}`);
                var topPrediction = jsonObj["Predictions"][0];

                // make sure we only get confidence level with 0.80 and above
                if (topPrediction.Probability >= 0.80) {
                    var probability = convertToPercentWithoutRounding(topPrediction.Probability);
                    session.send(`Hey, I'm ${probability} sure that this is a ${topPrediction.Tag}.`);
                } else {
                    session.send('Sorry! I don\'t know what that is :(');
                }
            });
    } else {
        session.beginDialog('qnaMaker');
    }

    // always end the dialog here to make sure we "clean" the conversation from the start
    session.endDialog();
});

bot.dialog('qnaMaker', qnaMakerDialog);

function convertToPercentWithoutRounding(number) {    
    number = number.toString();
    var temp = number.split(".");
    number = temp[1];
    number = number.substr(0, 4);
    return (number / 100) + "%";
}

// Utilities code are from https://github.com/Microsoft/BotBuilder-Samples/blob/master/Node/intelligence-ImageCaption/app.js
function hasImageAttachment(session) {
    return session.message.attachments.length > 0 &&
        session.message.attachments[0].contentType.indexOf('image') !== -1;
}

function getImageStreamFromMessage(message) {
    var headers = {};
    var attachment = message.attachments[0];
    if (checkRequiresToken(message)) {
        // The Skype attachment URLs are secured by JwtToken,
        // you should set the JwtToken of your bot as the authorization header for the GET request your bot initiates to fetch the image.
        // https://github.com/Microsoft/BotBuilder/issues/662
        connector.getAccessToken(function (error, token) {
            var tok = token;
            headers['Authorization'] = 'Bearer ' + token;
            headers['Content-Type'] = 'application/octet-stream';

            return needle.get(attachment.contentUrl, { headers: headers });
        });
    }

    headers['Content-Type'] = attachment.contentType;
    return needle.get(attachment.contentUrl, { headers: headers });
}

function checkRequiresToken(message) {
    return message.source === 'skype' || message.source === 'msteams';
}