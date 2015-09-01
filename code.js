process.stdout.write( '\u001B[2J\u001B[0;0f' );

var fs = require( 'fs' );
var path = require( 'path' );

readFile( './z.txt' );

function readFile( name ) {

	fs.readFile( name, {encoding:'utf8'}, function( err, data ) {
		if ( err ) throw err;

		var arr = data.split( '\n' );

		// errSets[] 內每組代表一個錯誤
		// 最後一筆為 total errors
		// 長度為 2 的，代表為 simple error
		// 	- 第一行是檔案
		// 	- 第二行是錯誤
		//
		// 長度為 4 的，代表為 argument error
		// 	- 第一行為檔案
		// 	- 第二行固定是 'error'
		// 	- 第三行為 invoke 方的錯誤與 type
		// 	- 第四行固定是 'This type is incompatible with'
		// 	- 第五行為 receive 方宣告的 type
		var errSets = [];

		var isStart = true;
		var tmp = [];
		arr.forEach( ( line, idx ) => {

			isStart = line == '';

			if ( isStart ) {
				if ( idx > 0 ) {
					errSets.push( tmp );
					tmp = [];
				}

				return;
			}

			tmp.push( line );

		} )


		// 刪掉最後一筆，它是 'Found 4 errors'
		errSets.splice(errSets.length-1, 1);

		let errCount = errSets.length;

		// 將 errSets[] 內每筆錯誤送去 parse
		var arrErrorObj = errSets.reduce(
			( ac, item ) => {
				// console.log( '\n\n來了item: ', item );
				// return item;
				return [...ac, parse( item )];
			},

			[]
		);

		console.log( 'arrErrorObj: ', JSON.stringify( arrErrorObj, null, 2 ) );

		var arrMessages = arrErrorObj.reduce(
			( ac, item ) => {
				// console.log( '\n\n來了item: ', item );
				// return item;
				return [...ac, getTextMessage( item )];
			},

			[]
		);

		arrErrorObj.push({total: errCount});
		arrMessages.unshift(`Total Errors: ${errCount}\n`);

		writeFile( arrMessages.join('') );

		// console.log( '\n\n>>arrMessages: ', JSON.stringify(arrMessages, null, 2) );
		console.log( '錯誤數量:', errCount );
	} );
}

function writeFile( data ){
	data = 'Created: ' + new Date().toString() + '\n' + data;
	// data = 'Total Errors:' + Date.now() + '\n' + data;
	fs.writeFile('flow-results.txt', data, function (err) {
	  if (err) throw err;
	  console.log('file saved!');
	});
}

// 將每筆錯誤轉成 errObj{} 型式，方便將來各種應用
// 例如在 sublime 內顯示於 tooltip 內
function parse( arr ) {
	switch ( arr.length ){
		case 5:
			return {invoke: parseLine( arr[2] ), receive: parseLine( arr[4] ), msg: null };
		case 2:
			return {invoke: parseLine( arr[0] ), receive: null, msg: arr[1] };
		// case 1:
		// 	return {invoke: null, receive: null, msg: arr[0]};
	}
}

// 這是 errObj{} 的一種應用，就是漂亮的打印出來
function getTextMessage( errObj ) {

	let invoke = errObj.invoke;
	let receive = errObj.receive;
	let msg = errObj.msg;
	let template, result;

	if ( invoke && receive ) {

		var spaces = new Array( invoke.errStart ).join( ' ' );

		template = `
			Error:
			  ${invoke.errFile}, line ${invoke.errNumLine}
			  ${invoke.errLine}
			  ${spaces}↑ expecting "${receive.errType}", got "${invoke.errType}"\n
			  From:
			    ${receive.errFile}, line ${receive.errNumLine}
			    ${receive.errLine}
		`;

	}else if ( invoke && !receive ) {

		// invoke = parseLine(arr[0]);

		template = `
			Error:
			  ${invoke.errFile}, line ${invoke.errNumLine}
			  ${invoke.errLine}
			  ↑ ${msg}
		`;
	}

	result = template.replace( /\t/gi, '' );

	// console.log( '\n\nmsg: ', result );

	return result;
}

function parseLine( aLine ) {
	var tmp = aLine.split( ':' );
	var errFile = tmp[0];
	var errNumLine = +tmp[1];	// 0-based 轉成　1-based
	var errStart = +tmp[2].split( ',' )[0];
	var errEnd = +tmp[2].split( ',' )[1];
	var errType = tmp[3].trim();

	// @todo: 將來先檢查　map 中是否已讀過此檔案
	var file = fs.readFileSync( errFile, {encoding:'utf8'} );
	var contents = file.split( '\n' );

	// contents.forEach( ( item, idx ) => console.log( '>> ', idx, ' = ', item ) )
	// console.log( '錯誤行數: ', errNumLine);

	var errLine = contents[errNumLine - 1];

	// console.log( '錯誤內容: ', errLine );

	var errSelection = errLine.substring( errStart - 1, errEnd );	// -1 magic
	// console.log( '錯誤範圍: ', errSelection );

	// console.log( '錯誤類型: ', errType );

	// parsed error object
	return {errFile, errLine, errNumLine, errStart, errEnd, errSelection, errType};

}

