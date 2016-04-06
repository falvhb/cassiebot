var restify = require('restify');
var builder = require('botbuilder');
var Botkit = require('botkit');
var prompts = require('./prompts');
var url = require('url');

// Create bot and add dialogs
var DEBUG = false;


if (process.env.port || DEBUG){
    var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });
} else {
    var bot = new builder.TextBot();
}


var commands = new builder.CommandDialog()
    .matches('^(hello|hi|howdy|help)', builder.DialogAction.send(prompts.helpMessage))
    //.matches('^(?:new|save|create|add)(?: (.+))?', saveTask)
    //.matches('^(?:done|delete|finish|remove)(?: (\\d+))?', finishTask)
    //.matches('^(list|show|tasks)', listTasks)
    .onBegin(function (session, args, next) {
        session.send('Hello World');
    })  
    .onDefault(function(session, args){
        session.send("I'm sorry. I didn't understand: " + session.message.text);   
    });


bot.add('/', commands);

// Install logging middleware
bot.use(function (session, next) {
    if (/^\/log on/i.test(session.message.text)) {
        session.userData.isLogging = true;
        session.send('Logging is now turned on');
    } else if (/^\/log off/i.test(session.message.text)) {
        session.userData.isLogging = false;
        session.send('Logging is now turned off');
    } else {
        if (session.userData.isLogging) {
            console.log('Message Received: ', session.message.text);
        }
        next();
    }
});


// Setup Restify Server
if (process.env.port || DEBUG){





    var slackController = Botkit.slackbot();
    var slackBotSpawn = slackController.spawn({
      token: process.env.token
    });
    
    var slackBot = new builder.SlackBot(slackController, slackBotSpawn);
    slackBot.add('/', commands);
    
    slackBot.listenForMentions();
    
    if (!DEBUG){
        slackBotSpawn.startRTM(function(err,slackBotSpawn,payload) {
            if (err) {
                throw new Error('Could not connect to Slack');
            }
        });
    }

    /**
     * SERVER 
     */
    var server = restify.createServer();
    
    server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
    
    server.get('/', function(req, res, next) {
        res.send('hello ' + process.env.appId);
        next();
    });

    
    //External API
    server.get('/ext', function(req, res, next) {
        var query = url.parse(req.url,true).query;
        console.log('params', query)
            if (query.msg){
            var msg = "A message for you:" + query.msg;
            builder.DialogAction.send(msg);
            console.log("slackBot", slackBot.bot);
            slackBot.bot.say(msg);
            res.send("A message for you:" + msg);
        } else {
            res.send('No msg...');
        }
        next();
    });

    server.listen(process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
    });

} else {
    bot.listenStdin();
}