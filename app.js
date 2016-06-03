var restify = require('restify');
var builder = require('botbuilder');
var Botkit = require('botkit');
var sprintf = require("sprintf-js").sprintf
var url = require('url');

var googleTranslate = require('google-translate')(process.env.translateKey || '');

var prompts = require('./prompts');
var api = require('./api');
var search = require('./search');

var formatter = require('./formatter');
var texting = require('./texting');
var logging = require('./logging');
var helper = require('./helper');
var userdata = require('./userdata');
var luisApi = require('./luis');

// Create bot and add dialogs
var DEBUG = process.env.debug === 'true' || false;


function sende(session, text, intent, force){
    if (typeof text === 'string'){
        text = [text];
    }
    text = text || 'Ich bin sprachlos.';
    
    if (userdata.getFlag(session, 'offended') && force !== true){
        text = '...';
    }
    
    if (typeof session.flagFake === 'undefined'){
        var msg = new builder.Message();
        msg.setLanguage(session.message.sourceLanguage || session.message.language);
        msg.setText(session, text);
        session.send(msg);
     } else {
         //TODO Define reply object
         //TODO choose text from text array randomly
         var reply = {};
         reply.text = text[Math.floor(Math.random()*text.length)];
         console.log('SENDE>', reply);
         session.send(reply);
     }
    
  logging.conversation({
	"message_text": session.message.text,
	"message_sourcetext": session.message.sourceText,
	"message_language": session.message.language,
	"message_sourcelanguage": session.message.sourceLanguage,
	"reply_intent": intent,  
	"reply_language": msg ? msg.language : 'de',
	"reply_text": msg ? msg.text : reply.text,
	"channel": session.message.from ? session.message.from.channelId : 'No message.from',
	"debug": "sendFunction"
  });
}


if (process.env.PORT || process.env.port || DEBUG){
    var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });
    bot.configure({
        userWelcomeMessage: "userWelcomeMessage",
        goodbyeMessage: "goodbyeMessage"
    });        
} else {
    var bot = new builder.TextBot();
}

var dialog = new builder.LuisDialog('https://api.projectoxford.ai/luis/v1/application?id=3a505278-4c2c-4d3b-bdb5-43c4de6cc83e&subscription-key=' + process.env.luisKey);

/**
 * Extend default dialog to be reusable
 */
var xdialog = {
    _data: {},
    on: function(name, callback){
        dialog.on(name, callback);
        xdialog._data[name] = callback;
    },
    trigger: function(name, session, args){
        if (typeof xdialog._data[name] === 'function'){
            xdialog._data[name](session, args);
        } else {
            console.log('WARNING: Intent ' + name + ' not found in xdialog.');
        }
    }
}


/**
 * Register intents
 */
texting.onReady(function(intents){
    
    /** Defaults */
    if (texting.static('welcome') && texting.static('goodbye'))
    bot.configure({
        userWelcomeMessage: texting.static('welcome'),
        goodbyeMessage: texting.static('goodbye')
    }); 
    
    
    intents.forEach(function(intent){
       var aIntent = intent.split('.');
       switch (aIntent[0]){
           
          /** Static intents */
          case 'static':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.static.' + aIntent[1], function (session, args) {
                var force = false;
                switch (aIntent[1]) {
                    case 'offend':
                        userdata.setFlag(session, 'offended', true);
                        force = true; //let message through
                        break;
                    case 'excuse':
                        userdata.setFlag(session, 'offended', false);
                        break;
                    default:
                        break;
                }
                sende(session, texting.static(aIntent[1]), 'bot.static.' + aIntent[1], force);
            });          
            break;
           
          /** Feeds  */
          case 'feed':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.feed.' + aIntent[1], function (session, args) {
                api.readFeed('wiwo', aIntent[1]).then(function(data){
                    userdata.rememberLastArticles(session, data);
                    sende(session,
                          formatter.toLinkList(data, texting.get(intent)),
                          'bot.feed.' + aIntent[1]);
                });
            });
            break;
            
          //doesn't care about type - just confirms that intent was recognized
          case 'temp':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.temp.' + aIntent[1], function (session, args) {
                sende(session, texting.get(intent), 'bot.' + 'bot.temp.' + aIntent[1]);
            });  
          
          case 'dynamic':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.dynamic.' + aIntent[1], function (session, args) {
                sende(session, texting.dynamic(aIntent[1]), 'bot.' + intent);
            });  
            
          default:
            console.warn('SYS> Not action for intent: ' + intent[0] + ' available');  
       }
    });
     
});



xdialog.on('bot.search', 
    function (session, args) {
        var searchTerm = builder.EntityRecognizer.findEntity(args.entities, 'Search Term');
        console.log('Search Term', searchTerm);
        if (!searchTerm) {
           sende(session,
                 "Es tut mir leid. Dies habe ich nicht verstanden: '" + session.message.text + "' [Search Term Missing]",
                 'bot.search-NoSearchTerm');
        } else {
           search.doSearch(searchTerm.entity).then(function(data){
               console.log('search_result', data);
               if (data.length){
                    sende(session, formatter.toSearchResultsList(data, searchTerm.entity),'bot.search');
               } else {
                    sende(session,
                    sprintf("Suche nach '%s' hat leider nichts erbracht... Sorry.", searchTerm.entity),
                    'bot.search');
               }
           }).catch(function(err){
               sende(session,
                     sprintf("Fehler bei der Suche nach '%s'. ärgerlich...", searchTerm.entity),
                     'bot.search');
           })
           
        }
    }
);

/**
 * SEARCH FOR STOCK 
 */
xdialog.on('bot.stock', function (session, args) {
    var searchTerm = builder.EntityRecognizer.findEntity(args.entities, 'Search Term');
    
    if (!searchTerm){
        var stagedSearchTerm = helper.getQuoted(session.message.text);
        if (stagedSearchTerm){
            searchTerm = {
                entity: stagedSearchTerm
            };
        }
    }
     
    if (!searchTerm) {
        sende(session, texting.get('stock__nosearchterm'), 'bot.stock__nosearchterm');
    } else {
        //console.log('SearchTerm:', searchTerm.entity);
        api.getStock(searchTerm.entity).then(function(data){
            //success:
            //console.log('DEBUG',data.hrefMobile.split('=')[1]);
            sende(session, texting.get('stock__found',
                data.descriptionShort,
                data.lastPrice.replace('&euro;','€'),
                data.quoteTime,
                data.hrefMobile.split('=')[1]
                ), 'bot.stock__nosearchterm');              
        }).catch(function(err){
            //error:
            sende(session, texting.get('stock__error', err.description), 'bot.stock__error');            
        });        
    }

});

xdialog.on('bot.temp.feed.author.recent', 
    function (session, args) {
        var author = builder.EntityRecognizer.findEntity(args.entities, 'Author');
        console.log('Author', author);
        if (!author) {
           sende(session,
                 "Es tut mir leid. Dies habe ich nicht verstanden: '" + session.message.text + "' [Author Missing]",
                 'bot.temp.feed.author.recent-NoAuthor');
        } else {
            sende(session, sprintf(texting.get('temp.feed.author.recent').pop(), author.entity), 'bot.temp.feed.author.recent');
            //TODO: Add query for author RSS feed
        }
    }
);

xdialog.on('bot.ressort.recent', 
    function (session, args) {
        var ressort = builder.EntityRecognizer.findEntity(args.entities, 'Ressorts');
        console.log('Ressort', ressort);
        
        var keywords = {
            'cooperation': 'unternehmen',
            'technology': 'technologie',
            'politics': 'politik',
            'policy': 'politik',
            'success': 'erfolg',
            'finance': 'finanzen'
        };
        var found = false;
        var ressortFound = '';
        
        for (var x in keywords){
            if (!found && session.message.text.indexOf(x) > -1){
                ressortFound = keywords[x];
                found = true;
            }
        }
        
        if (!found) {
           sende(session,
                 "Es tut mir leid. Dies habe ich nicht verstanden: '" + session.message.text + "' [Ressorts Missing]",
                 'bot.ressort.recent-NoRessort');
        } else {
            console.log('Ressort>' + ressortFound);
            api.readFeed('wiwo', ressortFound).then(function(data){
                userdata.rememberLastArticles(session, data);
                sende(session,
                        formatter.toLinkList(data, texting.get('ressort.recent', ressortFound.charAt(0).toUpperCase() + ressortFound.slice(1))),
                        'bot.feed.' + ressortFound);
            });
            
            
            // sende(session, sprintf(texting.get('ressort.recent').pop(), 
            //     ressortFound.charAt(0).toUpperCase() + ressortFound.slice(1)
            //     ), 'bot.ressort.recent');
            //TODO: Add query for author RSS feed
        }
         
        /*if (!ressort) {
           sende(session,
                 "Es tut mir leid. Dies habe ich nicht verstanden: '" + session.message.text + "' [Ressorts Missing]",
                 'bot.ressort.recent-NoRessort');
        } else {
            sende(session, sprintf(texting.get('ressort.recent').pop(), ressort.entity), 'bot.ressort.recent');
            //TODO: Add query for author RSS feed
        }*/
    }
);

 
dialog.onBegin(function (session, args, next) {
    sende(session, 'Hallo Welt!','onBegin');
});  

dialog.onDefault(function(session, args){
    sende(session,
        sprintf("Es tut mir leid. Dies habe ich nicht verstanden.  \nÜbersetzung: '%s'.  \nBeste Vermutung: %s (%s%%)",
           session.message.text,
           helper.getIntent(args),
           helper.getConfidence(args)
        ),
        'onDefault');   
});


bot.add('/', dialog);


// bot.use(function (session, next){
//    if (typeof session.userData.flags === 'undefined'){
//        session.send('...');
//    }
    
// });

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
    'EndOfConversation'
];

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
if (process.env.PORT || process.env.port || DEBUG){




    if (process.env.token){
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
    if (process.env.translateKey){
        server.get('/ext', function(req, res, next) {
            var query = url.parse(req.url,true).query;
            //console.log('params', query)
            res.header("Content-Type", "application/json");
            res.charSet('utf-8');
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET');            

            if (query.msg){
                var msg = query.msg;

                googleTranslate.translate(msg, 'de','en', function(err, translation) {
                    if (err){
                        res.send(err);
                    } else {
                        console.log(translation);
                        //res.send("Translation: " + translation.translatedText);
                        
                        var message = {
                              text: translation.translatedText,
                              sourceText: msg,
                              language: 'en',
                              sourceLanguage: 'de'  
                        };
                        
                        res.message = message;
                        res.userData = {};
                        res.flagFake = true;
                        
                        
                        //sende(res, translation.translatedText, '');
                        
                        luisApi.query(translation.translatedText).then(
                            function(json){
                                var args = JSON.parse(json);
                                if (helper.getConfidence(args) > 9){
                                    xdialog.trigger(helper.getIntent(args), res, args);    
                                }
                                
                            }
                        )
                        
                        //todo Args = LUIS Object
                    }
                // =>  { translatedText: 'Hallo', originalText: 'Hello', detectedSourceLanguage: 'en' }
                });


                
            } else {
                res.send('No msg...');
            }
            next();
        });
    } else {
        console.log('ERR> Problem detected.');
        if (typeof process.env.translateKey === 'undefined'){
            console.log('ERR> translateKey Env Var missing');
        }
    }

    server.listen(process.env.PORT || process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
    });

} else {
    bot.listenStdin();
}
