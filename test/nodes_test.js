"use strict";

var nodes = require('../examples/nodes/index.js');
var fs = require('fs');

var i, f;

// exports.setUp = function(callback) {
//   // this.__log = console.log;
//   // console.log = function(){};
//   callback();
// };

// exports.tearDown = function(callback) {
//   //console.log = this.__log;
//   callback();
// };

// for ( i in nodes ) {
//   if ( i.substr === '#' ) {
//     continue;
//   }
//   f = './examples/nodes/' + i + '/test.js';
//   exports.node = {};  
//   if (fs.existsSync(f)) { 
//     exports[i] = require('../examples/nodes/' + i + '/test.js');
//   }
// }

// exports['nodes'] = {
//   'load': function(test) {

//     test.expect(1);

//     // tests here
//     test.equal( typeof(nodes), 'object', 'should be an object.');
//     test.done();
//   }
// };
