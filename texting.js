var request = require('request');
var fs = require('fs');
var texting = {};

var CONST = {
  SHEET_ID: '1xFit8MsAoCgtQ_E1pSeX8KY2v5HBnzl1AR8sO69a-N4'
};

//load XLS file
function loadXls(cb){
  var url = 'https://spreadsheets.google.com/feeds/list/1/' + CONST.SHEET_ID + '/od6/public/basic?alt=json';
  
  
  function doCallback(data, error){
    // "static.hello":["hi","hallo","test"];
    var lib = {};
    if (error){
      return false;
    } else {
      var json = JSON.parse(data);
      
      cb(json.feed.entry);
    }
  }
  
  
  if (process.env.proxysrv) {
    var body = fs.readFileSync('./spreadsheet.json').toString();
    doCallback(body);
  } else {  
    request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body) // Show the HTML for the Google homepage. 
        doCallback(body);
      } else {
        console.log('ERROR', error);
        doCallback(undefined, error);
      }
    });  
  }
}



if (require.main === module) {

  console.log('Texting', process.env.proxysrv);
  loadXls(function(data){
    console.log(data);
  });
} else {
    module.exports = texting;
}
