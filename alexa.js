var request = require('request');
var alexaApp = require('alexa-app');
var app = new alexaApp.app('sample');
var api = require('./api');


function log(txt){
  console.log('ALEXA>' + txt);
}
/**
 * { id: '14547488',
    date: Fri Sep 16 2016 04:00:00 GMT+0000 (UTC),
    title: 'Banken langen am Geldautomaten zu',
    summary: 'Eine aktuelle Umfrage im Auftrag der Wirtschaftswoche belegt: Die Gebühren am Geldautomaten steigen weiter. Vor allem junge Kunden übersehen diesen Kostenfaktor.',
    link: 'http://www.wiwo.de/finanzen/geldanlage/automatengebuehren-banken-langen-am-geldautomaten-zu/14547488.html?share=bot',
    categories: [ 'Geldanlage' ],
    ago: 'vor 2 Stunden',
    imageUrl: 'http://www.wiwo.de/images/geldautomaten/14553400/3-format7.png?format=format7',
    overline: 'Automatengebühren',
    premium: false }
    
  */
function extractNews(data, count){
  var r = '';
  for (var i=0,ii=count || data.length; i<ii; i+=1){
    r += (data[i].overline ? data[i].overline + ': ' : '') + data[i].title + '. ';
  }
  return r.replace(/ +(?= )/g,'');
}

function extractNewsItems(data, count){
  var r = [];
  for (var i=0,ii=count || data.length; i<ii; i+=1){
    r.push(data[i].summary);
  }
  return r;
}

var map = {
  GetNewsRecent: 'recent',
  GetNewsHot: 'hot'
}

var intro = {
  recent: "Hier sind die drei neusten Artikel: ",
  hot: "Die am häufigsten gelesenen Artikel:"  
};

var cache = {
  wiwo: {
    recent: {
      summary: false,
      items: []
    },
    hot: {
      summary: false,
      items: []
    }
  }
};

function getCachedFeed(tenant, feed){
  if (cache[tenant] && cache[tenant][feed]){
    return cache[tenant][feed].summary;
  } else {
    return 'Die Inhalte sind leider derzeit nicht verfügbar';
  }
}

function getCachedItem(tenant, feed, item){
  item = parseInt(item, 10);
  if (!isNaN(item) && cache[tenant] && cache[tenant][feed] && cache[tenant][feed].items[item]){
    return cache[tenant][feed].items[item];
  } else {
    return 'Fehler beim lesen von Item ' + feed + '.' + item + '';
  }
}

function updateCache(tenant, feed){
  api.readFeed(tenant, feed).then(function(data){
      var text = intro[feed] + extractNews(data, 3);
      cache[tenant][feed].summary = text;
      cache[tenant][feed].items = extractNewsItems(data, 3);
      log('Cache ' + tenant + '.' + feed + ' updated with ' + text.length + ' characters');
  }).catch(function(err){
      cache[tenant][feed].summary = 'Es ist leider ein Fehler aufgetreten beim Lesen des RSS Feeds: ' + tenant + '.' + feed + ' Err:' + err;
  });
}

function updateCaches(){
  log('Updated caches...');
  Object.keys(cache).forEach(function(tenant){
    Object.keys(cache[tenant]).forEach(function(feed){
      updateCache(tenant, feed);
    });
  });
}

setInterval(updateCaches,1000*60);
updateCaches();


function getRSSAnswer(request, response) {
    response.say(getCachedFeed('wiwo', request._feed));
    response.send();
    
    /*api.readFeed('wiwo', request._feed).then(function(data){
        var text = request._introText + extractNews(data, 3);
        console.log('text', text);
        response.say(text);
        response.send();
    }).catch(function(err){
        response.say('Es ist leider ein Fehler aufgetreten');
        response.send();
    });*/
    return false;
  }


// app.intent('GetNewsRecent',
//   function(request, response) {
    
//     api.readFeed('wiwo', 'recent').then(function(data){
//         var text = "Hier sind die drei neusten Artikel: " + extractNews(data, 3);
//         console.log('text', text);
//         response.say(text);
//         response.send();
//     }).catch(function(err){
//         response.say('Es ist leider ein Fehler aufgetreten');
//         response.send();
//     });
//     return false;
//   }
// );

app.error = function(exception, request, response) {
    response.say("Sorry, something bad happened");
};

app.intent('GetNewsRecent',
  function(request,response) {
    response.session('feed', 'recent');
    response.say(getCachedFeed('wiwo', 'recent'));
    response.shouldEndSession(false);
    response.send();
  }
);

app.intent('GetNewsHot',
  function(request,response) {
    response.session('feed', 'hot');
    response.say(getCachedFeed('wiwo', 'hot'));
    response.shouldEndSession(false);
    response.send();
  }
);

app.intent('GetNewsItem',
  function(request,response) { 
    var item = request.slot('item');
    var feed = request.session('recent') || 'recent'; 
    response.say(getCachedItem('wiwo', feed, item));
    response.shouldEndSession(false);    
    response.send();    
  }
);



//External API
var alexa = {};

alexa.process = function(req, res, next) {

  app.request(req.body)        // connect express to alexa-app 
    .then(function(response) { // alexa-app returns a promise with the response 
      res.send(response);      // stream it to express' output 
  });
    
  next();
};

alexa.api = function(req, res, next) {
  var text = 'Initialisiere';
  switch (req.query.intent){
    case 'GetNewsRecent':
      text = getCachedFeed('wiwo', 'recent');
      break;
    case 'GetNewsHot':
      text = getCachedFeed('wiwo', 'hot');
      break;  
    case 'GetNewsItem':
      text = getCachedItem('wiwo', req.query.feed, req.query.item);
      break; 
    default:
      text = 'Absicht unbekannt: ' + req.query.intent ;
  }
  res.send(text);
};


alexa.json = {
  "test": {
    "session": {
      "sessionId": "SessionId.ff402e74-ae19-4022-b45e-6f00029115ad",
      "application": {
        "applicationId": "amzn1.ask.skill.66b57066-2ed6-4fe1-8ae6-c5791b8bfe7c"
      },
      "attributes": {},
      "user": {
        "userId": "amzn1.ask.account.AFP3ZWPOS2BGJR7OWJZ3DHPKMOMCZUNLLZQVFITMHOCHEFJPVKHUEVBXSW3ZVU4RIG6RETIH46QYQ6WLCSKL7YGX5K3VBDPBCCZVSNYHROTVGCKVPIOHNOXPXYULLXF76NCAZVI4SBCSMNMCA4SATXNQ64AJMH4B5HR4IFLK57OHTEBLD5X2E4D43DZJIZ73Q4NTWX3HYNUGUZA"
      },
      "new": true
    },
    "request": {
      "type": "IntentRequest",
      "requestId": "EdwRequestId.13d65a85-99f5-489e-90cd-5bb8b4c4e314",
      "locale": "de-DE",
      "timestamp": "2016-09-16T05:49:11Z",
      "intent": {
        "name": "GetNewsRecent",
        "slots": {}
      }
    },
    "version": "1.0"
  }  
};


if (require.main === module) {
  // standalone
 
  
} else {
    module.exports = alexa;
}




/**
 *
 * {
  "session": {
    "sessionId": "SessionId.ff402e74-ae19-4022-b45e-6f00029115ad",
    "application": {
      "applicationId": "amzn1.ask.skill.66b57066-2ed6-4fe1-8ae6-c5791b8bfe7c"
    },
    "attributes": {},
    "user": {
      "userId": "amzn1.ask.account.AFP3ZWPOS2BGJR7OWJZ3DHPKMOMCZUNLLZQVFITMHOCHEFJPVKHUEVBXSW3ZVU4RIG6RETIH46QYQ6WLCSKL7YGX5K3VBDPBCCZVSNYHROTVGCKVPIOHNOXPXYULLXF76NCAZVI4SBCSMNMCA4SATXNQ64AJMH4B5HR4IFLK57OHTEBLD5X2E4D43DZJIZ73Q4NTWX3HYNUGUZA"
    },
    "new": true
  },
  "request": {
    "type": "IntentRequest",
    "requestId": "EdwRequestId.13d65a85-99f5-489e-90cd-5bb8b4c4e314",
    "locale": "de-DE",
    "timestamp": "2016-09-16T05:49:11Z",
    "intent": {
      "name": "GetNewsRecent",
      "slots": {}
    }
  },
  "version": "1.0"
}
 * 
 */