var helper = {};

helper.getConfidence = function (args) {
    if (args.intents.length){
        return Math.floor(args.intents[0].score * 100);
    } 
    return 0;
}

helper.getIntent = function (args) {
    if (args.intents.length){
        return args.intents[0].intent;
    } 
    return 'No Intent returned';
}


if (require.main === module) {
  console.log('helper');
  
} else {
    module.exports = helper;
}