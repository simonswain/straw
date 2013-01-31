var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal(node.title, 'Stats', 'should be Stats');
    node.stop(function(){
      test.done();
    });
  }
};
