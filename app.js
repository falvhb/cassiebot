var restify = require('restify');
var builder = require('botbuilder');
var Botkit = require('botkit');
var sprintf = require("sprintf-js").sprintf
var url = require('url');

var prompts = require('./prompts');
var api = require('./api');
var search = require('./search');

var formatter = require('./formatter');
var texting = require('./texting');

// Create bot and add dialogs
var DEBUG = false;


function sende(session, text){
    if (typeof text === 'string'){
        text = [text];
    }
    var msg = new builder.Message();
    msg.setLanguage(session.message.sourceLanguage || session.message.language);
    msg.setText(session, text);
    session.send(msg);
    // session.send({
    //     "language": session.message.sourceLanguage || session.message.language,
    //     "text": text
    // });
}


if (process.env.port || DEBUG){
    var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });
    bot.configure({
        userWelcomeMessage: "Hello... Welcome to the group.",
        goodbyeMessage: "Goodbye..."
    });        
} else {
    var bot = new builder.TextBot();
}

var dialog = new builder.LuisDialog('https://api.projectoxford.ai/luis/v1/application?id=3a505278-4c2c-4d3b-bdb5-43c4de6cc83e&subscription-key=' + process.env.luisKey);

// bot.news.recent
// bot.news.hot clicks

dialog.on('bot.news.recent', function (session, args) {
        api.readFeed('wiwo', 'recent').then(function(data){
            //console.log('Got', data);
            sende(session, formatter.toLinkList(data, 'Hier sind die fünf neusten Artikel'));
        });
});

dialog.on('bot.news.hot', function (session, args) {
        api.readFeed('wiwo', 'clicks').then(function(data){
            //console.log('Got', data);
            sende(session, formatter.toLinkList(data, 'Hier sind die fünf am meisten lesenen Artikel'));
        });
});

// dialog.on('bot.static.hi', function (session, args) {
//         sende(session, texting.static('hello'));
// });

texting.onReady(function(intents){
    intents.forEach(function(intent){
       var aIntent = intent.split('.');
       switch (aIntent[0]){
          case 'static':
            dialog.on('bot.static.' + aIntent[1], function (session, args) {
                sende(session, texting.static(aIntent[1]));
            });          
            break;
          default:
            console.warn('Not action for intent: ' + intent + ' available');  
       }
    });
    
     
});



dialog.on('bot.search', 
    function (session, args) {
        var searchTerm = builder.EntityRecognizer.findEntity(args.entities, 'Search Term');
        console.log('Search Term', searchTerm);
        if (!searchTerm) {
           sende(session, 'Ich habe versucht eine Suche durchzuführen, aber keinen Suchbegriff gefunden. Nutze "Suche..."');
        } else {
           search.doSearch(searchTerm.entity).then(function(data){
               console.log('search_result', data);
               if (data.length){
                    sende(session, formatter.toSearchResultsList(data, searchTerm.entity));
               } else {
                    sende(session, sprintf("Suche nach '%s' hat leider nichts erbracht... Sorry.", searchTerm.entity));
               }
           }).catch(function(err){
               sende(session, sprintf("Fehler bei der Suche nach '%s'. ärgerlich...", searchTerm.entity));
           })
           
        }
    }
);
 
dialog.onBegin(function (session, args, next) {
    sende(session, 'Hallo Welt!');
});  

dialog.onDefault(function(session, args){
    sende(session, "Es tut mir leid. Dies habe ich nicht verstanden: " + session.message.text);   
});


bot.add('/', dialog);

// Install logging middleware
bot.use(function (session, next) {
    if (/^\/log on/i.test(session.message.text)) {
        session.userData.isLogging = true;
        session.send('Logging is now turned on');
    } else if (/^\/log off/i.test(session.message.text)) {
        session.userData.isLogging = false;
        session.send('Logging is now turned off');
    } else if (/^\/recent/i.test(session.message.text)) {
        api.readFeed('wiwo', 'recent').then(function(data){
            //console.log('Got', data);
            session.send(formatter.toLinkList(data));
        });  
    } else {
        if (session.userData.isLogging) {
            console.log('Message Received: ', session.message.text);
        }
        next();
    }
});

var events = ['error',
'reply',
'send',
'quit',
'Message',
'DeleteUserData',
'BotAddedToConversation',
'BotRemovedFromConversation',
'UserAddedToConversation',
'UserRemovedFromConversation',
'EndOfConversation'];

events.forEach(function(name){
    bot.on(name,function(messageEvent){
        console.log('EVENT: ' + name, messageEvent);
    })    
});



var chatRooms = [];
function addRoom(session){
    var room = {};
    room.to = session.message.from;
    room.from = session.message.to;
}


// Add notification dialog
bot.add('/notify', function (session, msg) {
   session.send("External message '%s'.", alarm.title);
   session.endDialog(); // <= we don't want replies coming to us 
});



var commands = new builder.CommandDialog()
    .matches('^(hello|hi|howdy|help)', builder.DialogAction.send(prompts.helpMessage))
    //.matches('^(?:new|save|create|add)(?: (.+))?', saveTask)
    //.matches('^(?:done|delete|finish|remove)(?: (\\d+))?', finishTask)
    //.matches('^(list|show|tasks)', listTasks)
    .matches('.*(recent|updates|latest|newest|new).*',function (session, args, next) {
        api.readFeed('wiwo', 'recent').then(function(data){
            //console.log('Got', data);
            session.send(formatter.toLinkList(data));
        });        
    });
    
    
commands.onBegin(function (session, args, next) {
    session.send('Hello World');
})  
commands.onDefault(function(session, args){
    session.send("I'm sorry. I didn't understand: " + session.message.text);   
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
            console.log("slackBot", bot);
            //builder.DialogAction.send(msg);
            //bot.send(msg);
            //slackBot.bot.say(msg);
            //bot.beginDialog(address: IBeginDialogAddress, dialogId: string, dialogArgs?: any): void
            //bot.beginDialog({ from: alarm.from, to: alarm.to }, '/notify', msg);
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