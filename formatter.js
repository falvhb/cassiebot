var formatter = {};

formatter.toText = function(data, title){
	var text = '';
	var i = 0;
	function addLine(line){
		text += line + '\n\n';
	}
	
	addLine('**'+title+':**')
	data.forEach(function(row){
		addLine(++i + '. ' + row.overline + ': ' + row.title + ' - [Artikel öffnen](' + row.link + ')' + ' *(' + row.ago + ')*');
		addLine('');
	});
	
	return text;
}


module.exports = formatter;