var Q = require('Q');
var moment = require('moment');
moment.locale('de');
//TODO remove key
var Bing = require('node-bing-api')({ accKey: process.env.bingKey    });

var search = {};



function parseItem(item) {

  var data = {
    id: item.Url.split('/').pop().split('.')[0],
    date: new Date(item.Date),
    title: item.Title,
    summary: item.Description,
    //html: item.description,
    link: item.Url + '?share=bot',
  };
  data.ago = moment(data.date).fromNow();
  return data;
}


search.doSearch = function(searchTerm){
  var deferred = Q.defer();
    console.log('doSearch>start');
    Bing.news(searchTerm + " site:wiwo.de", {
		top: 5,  // Number of results (max 15)
		skip: 0,   // Skip first 3 results
		newsSortBy: "Date", //Choices are: Date, Relevance
		//newsLocationOverride: "de-de", // Only for en-US market
		options: ['EnableHighlighting']
	}, function(error, res, body){
		if (error){
			console.log('doSearch>Error:', error);
            deferred.reject({status: error});
		} else {
            console.log('doSearch>body', body);
            if (body && body.d && body.d.results){
                var items = [];
                body.d.results.forEach(function(item){
                    items.push(parseItem(item));
                })
                deferred.resolve(items);
            } else {
                deferred.reject({status: 'no results'});
            }
        }
	});	

    return deferred.promise;
}


if (require.main === module) {
    console.log('Hallo search');
	
    search.doSearch('angela merkel').then(function(data){
      console.log('Got', data);
    });
	
} else {
    module.exports = search;
}