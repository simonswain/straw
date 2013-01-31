var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal(node.title, 'Ping', 'should be Ping');
    test.done();
  },
  'stop': function(test) {
    test.expect(1);
    var node = new Node();
    node.run(function(){});
    node.stop(function(err) {
      test.equal(err, false, 'Error should be false');
      test.done();
    });
  },
  'output': function(test) {
    test.expect(1);
    var node = new Node({interval: 100});
    node.run(function(){});
    node.on('message', function(data){
      test.notEqual(data.message.ping, undefined, 'Ping key should exist');
      node.stop(function(err){
        test.done();      
      });
    });
  }
};
