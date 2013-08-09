var Node = require('../examples/nodes/oddeven.js');

var node;

module.exports = {
  'create': function(test) {
    node = new Node(function(){
      test.done();
    });
  },
  'process-odd': function(test) {
    test.expect(2);
    var counts = 0;
    node.on('message', function(data){

      if(data.outlet === 'odd'){
        test.equal( data.message.value, '23', '23 should be odd' );
        counts ++;
        if(counts === 2){
          test.done();
        }
      }

      if(data.outlet === 'even'){
        test.equal( data.message.value, '46', '46 should be even' );
        counts ++;
        if(counts === 2){
          test.done();
        }
      }
    });

    node.process({value: 23});
    node.process({value: 46});
  }
};
