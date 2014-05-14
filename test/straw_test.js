"use strict";

var straw = require('../lib/straw.js');

exports['straw'] = {
  'exports': function(test) {
    test.expect(2);
    test.equal( typeof straw.create, 'function', 'should be a function.');
    test.equal( typeof straw.node, 'function', 'should be a function.');
    test.done();
  }
};
