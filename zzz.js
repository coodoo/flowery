/* @flow */

import bar from './zzz2';

// import foo2 from './zzz3';

function foo( bar:string, coo:number ):Array<string> {
	console.log( 'bbb' );
	return ['tada'];
}

class Too {

	t1 = '00';

	constructor(){
		this.t1 = 'ttt';
	}
}

// foobar
var k = foo( 33, 'a22' );

// var m = bar( 33, 'a22' );

// console.log( 'd' );
