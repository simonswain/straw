// var Node = require('../examples/nodes/passthru.js');

// var node;

// module.exports = {
//   'create': function(test) {
//     node = new Node(function(){
//       test.done();
//     });
//   },
//   'run': function(test) {
//     test.expect(1);
//     node.run(function(err) {
//       test.equal( err, false, 'Error should be false' );
//       test.done();
//     });
//   },
//   'stop': function(test) {
//     test.expect(1);
//     node.run(function(){});
//     node.stop(function(err) {
//       test.equal( err, false, 'Error should be false' );
//       test.done();
//     });
//   },
//   'process': function(test) {
//     test.expect(1);
//     var msg = {foo:'bar'};
//     node.process(
//       msg, 
//       function(err){
//         test.equal( err, false, 'Error should be false' );
//         test.done();      
//       });

//   },
//   'output': function(test) {
//     test.expect(2);
//     var msg = {foo:'bar'};
//     node.on('message', function(data){
//       test.equal( data.outlet, false, 'Outlet should be default (false) outlet' );
//       test.equal( data.message, msg, 'Message passed in should come from output' );
//       test.done();      
//     });
//     node.process(msg, function(){});   
//   }
// };
