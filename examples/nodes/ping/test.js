var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal(node.title, 'Ping', 'should be Ping');
    test.done();
  },
  'stop': function(test) {
    test.expect(2);
    var node = new Node();
    node.run();
    node.stop(function(err, result) {
      test.equal(err, false, 'Error should be false');
      test.equal(result, null, 'Result should be null');
      test.done();
    });
  },
  'output': function(test) {
    test.expect(1);
    var node = new Node({interval: 100});
    node.run();   
    node.on('message', function(data){
      test.notEqual(data.message.ping, undefined, 'Ping key should exist');
      node.stop(function(err, res){
        test.done();      
      });
    });
  }
};
