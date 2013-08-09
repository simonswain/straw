var Node = require('../examples/nodes/count-me.js');

var node;

module.exports = {
  'create': function(test) {
    test.expect(1);
    node = new Node({key:'count-me'}, function(){
      test.equal( node.opts.key, 'count-me', 'Should match' );
      test.done();
    });
  },
  'process': function(test) {
    test.expect(1);
    var msg = {foo:'bar'};
    node.process(
      msg,
      function(err){       
        test.equal( err, false, 'Error should be false.' );
        test.done();
      });
  },
  'output': function(test) {
    test.expect(2);
    node.on('message', function(data){
      test.equal( data.outlet, false, 'Pipe should be default (false) pipe.' );
      test.deepEqual( data.message.count, 2, 'Count should be ' );
      test.done();
    });
    node.process({foo:'bar'}, function(){});
  }
};

