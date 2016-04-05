var restify = require('restify');
var builder = require('botbuilder');
var prompts = require('./prompts.js');

// Create bot and add dialogs

if (process.env.port){
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
if (process.env.port){
    var server = restify.createServer();
    server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
    
    server.get('/', function(req, res, next) {
    res.send('hello ' + process.env.appId);
    next();
    })

    server.listen(process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
    });

} else {
    bot.listenStdin();
}