var FeedParser = require('feedparser');
var http = require("http");
var moment = require('moment');
moment.locale('de');
var Q = require('q');


var CONST = {
  RSS: 'http://www.wiwo.de/contentexport/feed/rss/',
  DOMAIN: {
    wiwo: 'www.wiwo.de' 
  }
};

var FEEDS = {
  wiwo: {
    recent: CONST.RSS + 'schlagzeilen',
    social: CONST.RSS + 'test_meistgeteilt',
    hot: CONST.RSS + 'test_meistgeklickt',
    unternehmen: CONST.RSS + 'unternehmen',
    finanzen: CONST.RSS + 'finanzen',
    politik: CONST.RSS + 'politk',
    erfolg: CONST.RSS + 'erfolg',
    techonolgie: CONST.RSS + 'technologie',
    green:'http://green.wiwo.de/feed/'
  }
};

var api = {};


function parseItem(item) {

  var data = {
    id: item.link.split('/').pop().split('.')[0],
    date: new Date(item.date),
    title: item.title,
    //summary: item.summary,
    //html: item.description,
    link: item.link + '?share=bot',
    categories: item.categories
  };
  data.ago = moment(data.date).fromNow();


  if (item['rss:authors'] && item['rss:authors'].authorid) {
    data.authorId = item['rss:authors'].authorid['#'];
  }

  if (item.enclosures && item.enclosures.length && item.enclosures[0].url) {
    data.imageUrl = item.enclosures[0].url;
  }
  if (item.title.indexOf(':') > -1) {
    var parts = item.title.split(': ');
    data.overline = parts.shift();
    data.title = parts.join(': ');
  }
  data.premium = item.link.indexOf('/my/') > -1;

  return data;
}


api.readFeed = function (source, id) {
  var deferred = Q.defer();
  var feedPath = FEEDS[source][id] + '?ts=' + new Date().getTime();
  var options;
  if (process.env.proxysrv) {
    options = {
      host: process.env.proxysrv,
      port: 80,
      path: feedPath,
      headers: {
        Host: CONST.DOMAIN[source]
      }
    };
  } else {
    options = {
      host: CONST.DOMAIN[source],
      path: feedPath
    };
  }

  console.log('Options:', options);

  http.get(options, function (res) {
    var items = [];
    var feedparser = new FeedParser();

    function reply() {
      //console.log('Items found:' + items.length);

      items.sort(function (a, b) {
        return b.date - a.date;
      })

      //items.forEach(function (item) {
        //console.log(item.ago);
      //})

      deferred.resolve(items.slice(0, 5));
    }

    res.pipe(feedparser);

    feedparser.on('error', function (err) {
      if (err) {
        //console.log(err, err.stack);
        reply();
      }

    });

    feedparser.on('readable', function () {
      var post;
      while (post = this.read()) {
        items.push(parseItem(post));
      }
    });

    feedparser.on('end', function () {
      //console.log('Articles fetched for feed "' + feedId + '":'  + staging[feedId].length);
      //stagingToLatest(feedId);
      //console.log('Done.')
      reply();
    });

  });

  return deferred.promise;
}


if (require.main === module) {
  var feed;
  for (var x in FEEDS.wiwo){
    feed = FEEDS.wiwo[x];
    console.log('FEED ', x, feed)
    api.readFeed('wiwo', 'recent').then(function(data){
      console.log('Got', data);
    });
  }
} else {
    module.exports = api;
}
