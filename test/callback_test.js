"use strict";

var Topology = require('../lib/topology.js');

exports['callback'] = {
  setUp: function(callback) {
    this.__log = console.log;
    console.log = function(){};
    callback();
  },
  tearDown: function(callback) {
    console.log = this.__log;
    callback();
  },
  'hello-world': function(test) {
    var topo = new Topology({
      'thru':{
        'node': __dirname + '/../examples/nodes/passthru',
        'input':'ping-out',
        'output':'passthru-out'
      }
    }, function(err, res){
      topo.destroy(function(){
        test.done();
      });
    });
  }
};
