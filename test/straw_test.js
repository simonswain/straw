var straw = require('../lib/straw.js');

exports['straw'] = {
  setUp: function(callback) {
    this.__log = console.log;
    console.log = function(){};
    callback();
  },
  tearDown: function(callback) {
    console.log = this.__log;
    callback();
  },
  'exports': function(test) {
    test.expect(1);
    test.equal( typeof straw.topology, 'function', 'should be a function.');
    test.done();
  }
};
