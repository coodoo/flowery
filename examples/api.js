
// 示範如何透過 API 操作此工具
// 也就是可透過 nodejs 來觸發此程式

import readFile from './flowery';

readFile('z.txt')
.then( result => console.log( '跑完結果: ', result ) );
