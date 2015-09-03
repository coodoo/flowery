#!/usr/bin/env node

if ( process.env.NODE_ENV && process.env.NODE_ENV !== 'production' ) {
	process.stdout.write( '\u001B[2J\u001B[0;0f' );
}

/*

Usage

1. CLI - file

	$ babel-node flowery log.txt

2. CLI - pipe

	$ flow | babel-node flowery

3. API

	import readFile from './flowery';
	readFile('z.txt').then( result => {console.log(result)}) // {arrErrorObj: [...], arrMessages: [...] }

*/

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

let arrErrorObj, arrMessages;

if ( process.argv.length > 2 ) {
	// 給傳檔案名稱的話，就直接開檔，這應該是 flow 生成的 log 檔
	readFile( process.argv[2] )
	.then( data => {
		if ( data.type == 'json' ) {
			handleJsonData( data ).then( result => {
				console.log( '\nresult: \n', require('util').inspect( result, false, 2, true) );
				debugger;
			});
		}else {
			handleRawData( data );
		}
	} )

}else {
	readStdin()
	.then( data => {
		// console.log( 'stdin data: ', data );
		handleRawData( data )
		.then( result => console.log( result.arrMessages.join( '\n' ) ) )
	} );
}

// 如果是透過 cli pipe 進來的，就從 stdin 讀資料
// $ flow | babel-node code.js
function readStdin() {
	return new Promise( ( resolve, reject ) => {

		let tmp, decoded;

		process.stdin.setEncoding( 'utf8' );

		process.stdin.on( 'readable', function() {

			tmp = process.stdin.read();

			if ( tmp !== null ) {

				// 有讀到東西，但有可能是 JSON 或 raw lines

				try {
					decoded = JSON.parse( tmp );

					console.log( '\ndecoded: \n', require( 'util' ).inspect( decoded, false, 6, true ) );

				}catch ( err ) {
					console.log( '不是 JSON 喔' );
				}

				resolve( tmp );

				// console.log( '\njson: \n', require('util').inspect( JSON.parse(tmp), false, 6, true) );

				// console.log( 'chunk: ', chunk );
			}else {
				resolve( null );
				process.stdin.end(); // pause()
			}
		} );

		// process.stdin.on( 'end', function() {
		// 	resolve(chunk)
		// } );
	} )
}

function parseRawOrJson( data ) {
	let content, type;
	try {
		content = JSON.parse( data );
		type = 'json';
	}catch ( e ) {
		console.log( 'parseRawOrJson 出錯: ', e.stack );
		type = 'raw';
	}

	return {
		type: type,
		data: content ? content : data,
	}
}

// 透過 API 指定 file，可直接開啟
export default function readFile( name ) {
	let data;
	return new Promise( ( resolve, reject ) => {
		data = fs.readFileSync( name, {encoding:'utf8'} );
		data = parseRawOrJson( data );
		resolve( data )
	} )

	// return handleRawData( data );
}

function handleJsonData( payload ) {
	console.log( '進到 handleJsonData: ', payload );
	let data = payload.data;
	let errors = data.errors;
	// debugger;

	if ( data.passed ) return Promise.resolve( 'no errors' );

	return new Promise( ( resolve, reject ) => {

		let invoke, receive;

		errors = errors.map( item => {

			let arrMessage = item.message;

			// debugger;

			switch ( arrMessage.length ) {

				case 1:
					invoke = arrMessage[0];
					 var msg = invoke.descr.split( '\n' );
					 var o = {
						errTarget: msg[0],
						errMsg: msg[1],
						errPath: invoke.path,
						errLine: invoke.line,
						errStart: invoke.start,
						errEnd: invoke.end,
					 }
					 return {invoke: o, receive: null};

				case 2:
					invoke = arrMessage[0];
					receive = arrMessage[1]; // 用不到

					var msg = invoke.descr.split( '\n' );
					var o = {
						errTarget: msg[0],
						errMsg: msg[1],
						errPath: invoke.path,
						errLine: invoke.line,
						errStart: invoke.start,
						errEnd: invoke.end,
					}

					return {invoke: o, receive: null};

				case 3:

					if ( arrMessage[1].descr.indexOf( 'type is incompatible' ) != -1 ) {

						// +TYPE ERROR+
						invoke = arrMessage[1];
						receive = arrMessage[2];

						msg = invoke.descr.split( '\n' );
						var o1 = {
							errTarget: msg[0],
							errMsg: msg[1],
							errPath: invoke.path,
							errLine: invoke.line,
							errStart: invoke.start,
							errEnd: invoke.end,
						}

						var o2 = {
							errTarget: receive.descr,
							errMsg: null,
							errPath: receive.path,
							errLine: receive.line,
							errStart: receive.start,
							errEnd: receive.end,
						}

						return {invoke: o1, receive: o2};

					}else {

						// +INVERTED+
						invoke = arrMessage[2];
						receive = arrMessage[1];

						msg = receive.descr.split( '\n' );
						var o1 = {
							errTarget: msg[0],
							errMsg: msg[1],
							errPath: receive.path,
							errLine: receive.line,
							errStart: receive.start,
							errEnd: receive.end,
						}

						var o2 = {
							errTarget: invoke.descr,
							errMsg: null,
							errPath: invoke.path,
							errLine: invoke.line,
							errStart: invoke.start,
							errEnd: invoke.end,
						}
					}

					return {invoke: o1, receive: o2};

			}
		} )

		console.log( '八組跑完了' );
		resolve(errors);

	} )
}

// 人工 parser，暫時不用
// parse non-json data
// 不論從 stdin or file 取得檔案，最終都到這裏處理
function handleRawData( data ) {

	return new Promise( ( resolve, reject ) => {

		var arr = data.split( '\n' );

		// errSets[] 內每組代表一個錯誤
		//
		// 最後一筆為 total errors
		//
		// 長度為 2 的，代表為 simple error
		// 	- 第一行是檔案
		// 	- 第二行是錯誤
		//
		// 長度為 3 的，代表為 property length
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
		errSets.splice( errSets.length - 1, 1 );

		// console.log( '\nerrSet: \n', require('util').inspect( errSets, false, 2, true) );

		let errCount = errSets.length;

		// 將 errSets[] 內每筆錯誤送去 parse
		arrErrorObj = errSets.reduce(
				( ac, item ) => {
					// console.log( '\n\n來了item: ', item );
					return [...ac, parse( item )];
				},

				[]
			);

		// console.log( 'arrErrorObj: ', JSON.stringify( arrErrorObj, null, 2 ) );

		// 應用：從 errObj 內生成錯誤訊息字串，方便 screen print 或寫出檔案
		arrMessages = arrErrorObj.reduce(
				( ac, item ) => {
					// console.log( '\n\n來了item: ', item );
					return [...ac, getTextMessage( item )];
				},

				[]
			);

		// 偷加上日期與錯誤數量等 meta data
		let date = 'Created: ' + new Date().toString() + '\n';
		arrErrorObj = [{ createdDate: date }, {total: errCount}, ...arrErrorObj];
		arrMessages = [date, `Total Errors: ${errCount}`, ...arrMessages];

		writeFile( arrMessages.join( '' ) );

		// console.log( '\n\n>>arrMessages: ', JSON.stringify(arrMessages, null, 2) );
		// console.log( '錯誤數量:', errCount );

		resolve( {arrErrorObj, arrMessages} )
	} )
}

function writeFile( data ) {
	// data = 'Created: ' + new Date().toString() + '\n' + data;

	// data = 'Total Errors:' + Date.now() + '\n' + data;
	fs.writeFile( 'flow-results.txt', data, function( err ) {
		if ( err ) throw err;
		console.log( '\nflow-results.txt saved.' );
	} );
}

// 將每筆錯誤轉成 errObj{} 型式，方便將來各種應用
// 例如在 sublime 內顯示於 tooltip 內
function parse( arr ) {
	switch ( arr.length ){

		case 5:
			return {invoke: parseLine( arr[2] ), receive: parseLine( arr[4] ), msg: null };

		case 3:
			return {invoke: parseLine( arr[0] ), receive: parseLine( arr[2] ), msg: arr[1] };

		case 2:
			return {invoke: parseLine( arr[0] ), receive: null, msg: arr[1] };

	}
}

// 這是 errObj{} 的一種應用，就是漂亮的打印出來
function getTextMessage( errObj ) {

	let invoke = errObj.invoke;
	let receive = errObj.receive;
	let msg = errObj.msg;
	let errType = invoke.errType;
	let template, result;

	// console.log( '\ninvokeObj: ', invoke, '\n\nreceive: ', receive, '\nmsg: ', msg );

	if ( invoke && receive && msg ) {
		// 3 行的
		// /Users/jlu/gitrepos/html/flowery/dynamic.js:4:10,17: property length
		// Property not found in
		// /private/tmp/flow/flowlib_35b40aae/core.js:70:1,87:1: Number

		var spaces = new Array( invoke.errStart ).join( ' ' );

		template = `
			> Error:
			  ${invoke.errFile}, line ${invoke.errNumLine}
			${invoke.errLine}
			${spaces}↑ ${errType}: ${msg}

			  From:
			  ${receive.errFile}, line ${receive.errNumLine}
			  ${receive.errLine}
		`;

	} else if ( invoke && receive && !msg ) {
		// 5 行的
		// /Users/jlu/gitrepos/html/flowery/sample.js:22:9,24: function call
		// Error:
		// /Users/jlu/gitrepos/html/flowery/sample.js:22:14,15: number
		// This type is incompatible with
		// /Users/jlu/gitrepos/html/flowery/sample.js:7:19,24: string

		var spaces = new Array( invoke.errStart ).join( ' ' );

		template = `
			> Error:
			  ${invoke.errFile}, line ${invoke.errNumLine}
			${invoke.errLine}
			${spaces}${'↑ expecting'} ${receive.errType}, got ${invoke.errType}

			  From:
			  ${receive.errFile}, line ${receive.errNumLine}
			  ${receive.errLine}
		`;

	} else if ( invoke && !receive ) {

		// invoke = parseLine(arr[0]);

		template = `
			${chalk.magenta.bold( '> Error:' )}
			  ${invoke.errFile}, line ${chalk.magenta( invoke.errNumLine )}
			  ${invoke.errLine}
			  ${chalk.white( '↑' )} ${chalk.white( msg )}
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

