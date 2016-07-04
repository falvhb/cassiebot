var Q = require('q');
var apiai = require("apiai")

var api = {};


var EXPERTBOTS = {
    faq: {
        id: 'e93c1e274a424b84907368d8784ed111'
    }
};


for (var bot in EXPERTBOTS){
    EXPERTBOTS[bot].api = apiai(EXPERTBOTS[bot].id);
};


api.query = function(searchTerm, appId){
    var deferred = Q.defer();
    var request = EXPERTBOTS[appId].api.textRequest(searchTerm);
    request.on('response', function(response) {
        var json = {
            reply: response.result.fulfillment.speech,
            score: Math.round(response.result.score * 100)
        };
        deferred.resolve(json);
    });
    
    request.on('error', function(error) {
        deferred.reject({status: error});
    });
    
    request.end();

    return deferred.promise;
};




if (require.main === module) {

  api.query('muss ich eingeloggt sein zum kommentieren?', 'faq').then(function(json){
     console.log('apiai.js>reply>', json); 
  }).fail(function(err){
      console.log('apiai.js>Error> Something went wrong', err);
  });
} else {
    module.exports = api;
}
