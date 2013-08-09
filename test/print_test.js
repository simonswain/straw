var Node = require('../examples/nodes/print.js');

var node;

module.exports = {
  'create': function(test) {
    node = new Node(function(){
      test.done();
    });
  }
};

