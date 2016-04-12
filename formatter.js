var formatter = {};

formatter.toText = function(data){
	var text = '';
	function addLine(line){
		text += line + '\n';
	}
	
	data.forEach(function(row){
		addLine(row.overline + ': ' + row.title);
		addLine(row.link + ' (' + row.ago + ')');
		addLine('');
	});
	
	return text;
}


module.exports = formatter;