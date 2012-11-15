var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal( node.title, 'Passthru', 'Should be Passthru' );
    test.done();
  },
  'run': function(test) {
    test.expect(2);
    var node = new Node();
    node.run(function(err, result) {
      test.equal( err, false, 'Error should be false' );
      test.equal( result, null, 'Result should be null' );
      test.done();
    });
  },
  'stop': function(test) {
    test.expect(2);
    var node = new Node();
    node.run();
    node.stop(function(err, result) {
      test.equal( err, false, 'Error should be false' );
      test.equal( result, null, 'Result should be null' );
      test.done();
    });
  },
  'process': function(test) {
    test.expect(2);
    var node = new Node();
    var msg = {foo:'bar'};
    node.process(
      msg, 
      function(err, result){
        test.equal( err, false, 'Error should be false' );
        test.equal( result, msg, 'Result should be same as input' );
        test.done();      
      });

  },
  'output': function(test) {
    test.expect(2);
    var node = new Node();
    var msg = {foo:'bar'};
    node.on('message', function(data){
      test.equal( data.outlet, false, 'Outlet should be default (false) outlet' );
      test.equal( data.message, msg, 'Message passed in should come from output' );
      test.done();      
    });
    node.process(msg);   
  }
};
