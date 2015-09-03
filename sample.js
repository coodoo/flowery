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

function barr(x) {
  return x*10;
}

barr("Hello, world!");

function lent(x) {
  return x.length;
}

var total = lent("Hello") + lent(null);

function total(numbers: Array<number>) {
  var result = 0;
  for (var i = 0; i < numbers.length; i++) {
    result += numbers[i];
  }
  return result;
}

total([1, 2, 3, "Hello"]);

function coo(x) {
  return x.length;
}

var res = coo("Hello") + coo(42);
