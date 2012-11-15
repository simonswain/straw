var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal( node.title, 'Print', 'Should be Print' );
    test.done();
  }
};

