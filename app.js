var restify = require('restify');
var builder = require('botbuilder');

// Create bot and add dialogs
var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });
bot.add('/', function (session) {
    session.send('Hello World');
});

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());

server.get('/', function(req, res, next) {
  res.send('hello ' + process.env.appId);
  next();
})

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});