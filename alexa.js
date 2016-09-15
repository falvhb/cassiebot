var request = require('request');

var alexa = {};

alexa.process = function(req, res, next) {
  //var jsonData = JSON.parse(req.body);
	console.log(req.body);
	req.body.loop = true;
	res.send(req.body);
  next();
};

if (require.main === module) {
  // standalone
 
  
} else {
    module.exports = alexa;
}
