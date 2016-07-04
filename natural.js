var natural = require('natural');
var fs = require('fs');
var classifier = new natural.BayesClassifier();

var api = {};

var classifierText = fs.readFileSync('expertbots.txt', "utf8");

classifierText.split('\n').forEach(function(line){
    var parts = line.split(':');
    if(parts.length === 2){
        classifier.addDocument(parts[1], parts[0]);
    }
});

classifier.train();


api.query = function(searchTerm, appId){
  var result = classifier.getClassifications(searchTerm);
  //console.log(result);
  var json = {
      reply: result[0].label,
      score: Math.round(result[0].value*10000)/1000
  };
  return json;
};

api.getExpert = function(searchTerm, minScore){
    var result = api.query(searchTerm);
    if (result.score >= minScore){
        return result.reply;
    } else {
        return '';
    }
};


var test = function(){
  var strings = [
    {q:'Was ist der Brexit', 'a': 'brexit'},
    {q:'Muss ich werbung sehen', 'a': 'faq'},
    {q:'Was wird aus England', 'a': 'brexit'},
    {q:'Wo ist mein Depot', 'a': 'faq'},
    {q:'Kontakt', 'a': 'faq'},
    {q:'Kundensupport', 'a': 'faq'},
    {q:'Wer ist BoJo', 'a': 'brexit'},
    {q:'Total sinnlose anfrage', 'a': 'none'}
  ];

  strings.forEach(function(str){
      console.log(str.q, str.a, api.getExpert(str.q, 0.1) || ' ---- ');
  })

}


if (require.main === module) {
    test();
} else {
    module.exports = api;
}
