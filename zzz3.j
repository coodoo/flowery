/* @flow */

import bar from './zzz2';

export default function foo2( bar:string, coo:number ):Array<string> {
	console.log( 'bbb' );
	return ['tada'];
}

// foobar
// var k = foo( 33, 'a22' );
var m = bar( 33, 'a22' );

// console.log( 'd' );
