var Q = require('q');
var request = require('request');
var read = require('node-readability');


var reading = {};


/**
 * Fetch Test from Website:
 * https://github.com/luin/readability
 * 
 * @param url: any URI to fetch HTML from
 * @returns text found on webbsite
 */
reading.doFetch = function(url){
    var deferred = Q.defer();
  

    read(url, function(err, article, meta) {
        
        if (err){
			console.log('doFetch>Error:', err);
            deferred.reject({status: err});
            return false;            
        }     
        // Main Article
        //console.log(article.content);
        // Title
        //console.log(article.title);

        // HTML Source Code
        //console.log(article.html);
        // DOM
        //console.log(article.document);

        // Response Object from Request Lib
        //console.log(meta);

        deferred.resolve(article.textBody);

        // Close article to clean up jsdom and prevent leaks
        article.close();
        
    });    


    return deferred.promise;    
};


if (require.main === module) {
    console.log('Hallo Reading');
	var url = 'http://www.wiwo.de/politik/deutschland/ber-zeitplan-eroeffnungstermin-fuer-hauptstadtflughafen-bleibt-in-der-schwebe/13490240.html';
    
    reading.doFetch(url).then(function(data){
      console.log('Got', data);
    });
	
} else {
    module.exports = reading;
}
