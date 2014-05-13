// "use strict";

// var Topology = require('../lib/topology.js');
// var Tap = require('../lib/tap.js');

// exports['tap'] = {
//   setUp: function(callback) {
//     this.__log = console.log;
//     console.log = function(){};
//     callback();
//   },
//   tearDown: function(callback) {
//     console.log = this.__log;
//     callback();
//   },
//   'tap-in-out': function(test) {
//     var topo, tap, done;

//     test.expect(1);
//     tap = new Tap({
//       'input':'to-tap',
//       'output':'from-tap'
//     });

//     var msg = {foo:'bar'};
    
//     tap.on('message', function(mess){
//       topo.destroy(function(){
//         tap.destroy(function(){
//           test.deepEqual(mess, msg);
//           test.done();
//         });
//       });
//     });

//     topo = new Topology({
//       'thru':{
//         'node': __dirname + '/../examples/nodes/passthru',
//         'input':'from-tap',
//         'output':'to-tap'
//       }
//     }, function(err, res){
//       // send output once topo is established
//       tap.send(msg);
//     });

//   }
// };
