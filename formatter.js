var formatter = {};

formatter.toText = function(data){
	var text = '';
	var i = 0;
	function addLine(line){
		text += line + '\n\n';
	}
	
	addLine('**Hier sind die fünf neusten Artikel:**')
	data.forEach(function(row){
		addLine(++i + '. ' + row.overline + ': ' + row.title + ' [Artikel öffnen](' + row.link + ')' + ' *(' + row.ago + ')*');
		addLine('');
	});
	
	return text;
}


module.exports = formatter;