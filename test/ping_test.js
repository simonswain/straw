// var Node = require('../examples/nodes/ping.js');

// var node;

// module.exports = {
//   'create': function(test) {
//     node = new Node(
//       {interval: 100},
//       function(){
//         test.done();
//       }
//     );
//   },
//   'stop': function(test) {
//     test.expect(1);
//     node.run(function(){});
//     node.stop(function(err) {
//       test.equal(err, false, 'Error should be false');
//       test.done();
//     });
//   },
//   'output': function(test) {
//     test.expect(1);
//     node.run(function(){});
//     node.on('message', function(data){
//       test.notEqual(data.message.ping, undefined, 'Ping key should exist');
//       node.stop(function(err){
//         test.done();      
//       });
//     });
//   }
// };
