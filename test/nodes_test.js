var nodes = require('../examples/nodes/index.js');
var fs = require('fs');

var i, f;

for ( i in nodes ) {
  if ( i.substr === '#' ) {
    continue;
  }
  f = './examples/nodes/' + i + '/test.js';
  if (fs.existsSync(f)) { 
    exports[i] = require('../examples/nodes/' + i + '/test.js');
  }
}

exports['nodes'] = {
  setUp: function(done) {
    // setup here
    done();
  },
  'load': function(test) {

    test.expect(1);

    // tests here
    test.equal( typeof(nodes), 'object', 'should be an object.');
    test.done();
  }
};
