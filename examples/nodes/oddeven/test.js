var Node = require('./index.js');

module.exports = {
  'create': function(test) {
    test.expect(1);
    var node = new Node();
    test.equal( node.title, 'OddEven', 'should be OddEven' );
    test.done();
  },
  'process': function(test) {
    test.expect(2);
    var node = new Node();

    node.process(
      {value: 23},
      function(err, result){
        test.equal( result.result, 'odd', '23 should be odd' );
      });

    node.process(
      {value: 46},
      function(err, result){
        test.equal( result.result, 'even', '46 should be even' );
        test.done();
      });
  }
};
