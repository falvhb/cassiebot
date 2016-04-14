var Q = require('Q');
//TODO remove key
var Bing = require('node-bing-api')({ accKey: "Gn/JoVedKGBKomQHnBlWnyctuyco++kRK/qynsuCWi4" });

var search = {};




if (require.main === module) {
    console.log('Hallo search');
	
	Bing.news("angela merkel site:wiwo.de", {
		top: 5,  // Number of results (max 15)
		skip: 0,   // Skip first 3 results
		newsSortBy: "Date", //Choices are: Date, Relevance
		newsLocationOverride: "DE", // Only for en-US market
		options: ['EnableHighlighting']
	}, function(error, res, body){
		if (error){
			console.log('Error:', error);
		}
		console.log(body);
	});	
	
} else {
    module.exports = search;
}