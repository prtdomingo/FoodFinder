'use strict';

require('dotenv').config();

const builder = require('botbuilder');
const restify = require('restify');
const cognitiveServices = require('botbuilder-cognitiveservices');
const customVisionService = require('./customVisionService.js');
const utils = require('./utils.js');
const restaurantService = require('./restaurantService.js');

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
    knowledgeBaseId: '0d8d66a3-1d9b-4d99-bc48-0865f2e55c5c',
    subscriptionKey: 'b096ae3292f048b8a4292acf0163f138'
});

const qnaMakerDialog = new cognitiveServices.QnAMakerDialog({
    recognizers: [recognizer],
    defaultMessage: 'Sorry, I don\'t know the answer to the question. :(',
    qnaThreshold: 0.3
});

// default dialog
bot.dialog('/', function(session){
    session.sendTyping();
    if (utils.hasImageAttachment(session)) {
        var stream = utils.getImageStreamFromMessage(session.message);
        customVisionService.predict(stream)
            .then(function (response) {
                // Convert buffer into string then parse the JSON string to object
                var jsonObj = JSON.parse(response.toString('utf8'));
                console.log(jsonObj);
                var topPrediction = jsonObj["Predictions"][0];

                // make sure we only get confidence level with 0.80 and above
                if (topPrediction.Probability >= 0.80) {
                    var probability = utils.convertToPercentWithoutRounding(topPrediction.Probability);
                    session.send(`Hey, I'm ${probability} sure that this is a ${topPrediction.Tag}.`);
                    
                    setTimeout(function () {
                        session.send(`Let me find you restaurants that offers a ${topPrediction.Tag}`);
                        session.sendTyping();

                        setTimeout(function () {
                            var filteredRestaurants = restaurantService.getRestaurantsList(topPrediction.Tag);
                            var message = new builder.Message()
                                .attachmentLayout(builder.AttachmentLayout.carousel)
                                .attachments(filteredRestaurants.map(restaurantService.restaurantAsAttachment));

                            session.send(message);
                        }, 2000);
                    }, 1000);

                } else {
                    session.send('Sorry! I don\'t know what that is :(');
                }
            }).catch(function (error) {
                console.log(error);
                session.send('Oops, there\'s something wrong with processing the image. Please try again.');
            });
    } else {
        session.beginDialog('qnaMaker');
    }

    // always end the dialog here to make sure we "clean" the conversation from the start
    session.endDialog();
});

bot.dialog('qnaMaker', qnaMakerDialog);

bot.on('conversationUpdate', function (activity) {
    // when user joins conversation, send instructions
    if (activity.membersAdded) {
        activity.membersAdded.forEach(function (identity) {
            if (identity.id === activity.address.bot.id) {
                var reply = new builder.Message()
                    .address(activity.address)
                    .text('Hi! I\'m a Food Finder Bot! You can send me pictures or food or ask me anything about restaurants.');
                bot.send(reply);
            }
        });
    }
});
