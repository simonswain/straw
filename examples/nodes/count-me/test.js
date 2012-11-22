var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal( node.title, 'Count', 'should be Count' );
    test.done();
  },
  'process': function(test) {
    test.expect(2);
    var node = new Node();
    var msg = {foo:'bar'};
    node.process(
      msg,
      function(err, result){
        test.equal( err, false, 'Error should be false.' );
        test.deepEqual( result.count, 1, 'Result should be 1' );
        test.done();
      });
  },
  'output': function(test) {
    test.expect(2);
    var node = new Node();
    node.on('message', function(data){
      test.equal( data.outlet, false, 'Pipe should be default (false) pipe.' );
      test.deepEqual( data.message.count, 1, 'Count should be 1' );
      test.done();
    });
    node.process({foo:'bar'});
  }
};

