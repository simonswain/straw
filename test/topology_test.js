"use strict";

var Topology = require('../lib/topology.js');

exports['topology'] = {
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
      'ping':{
        'node': __dirname + '/../examples/nodes/ping',
        'output':'ping-out'
      },
      'thru':{
        'node': __dirname + '/../examples/nodes/passthru',
        'input':'ping-out',
        'output':'passthru-out'
      },
      'count':{
        'node': __dirname + '/../examples/nodes/count',
        'input':'passthru-out',
        'output':'count-out'
      }
    }, function(err, res){
      topo.destroy(function(){
        test.done();
      });
    });
  },

  'multi-out': function(test) {
    var topo = new Topology({
      'ping-1':{
        'node': __dirname + '/../examples/nodes/ping',
        'output':'ping-1-out'
      },
      'ping-2':{
        'node': __dirname + '/../examples/nodes/ping',
        'output':'ping-2-out'
      },
      'count-1':{
        'node': __dirname + '/../examples/nodes/count',
        'input':'ping-1-out',
        'output':'count-1-out'
      },
      'count-2':{
        'node': __dirname + '/../examples/nodes/count',
        'input':'ping-2-out',
        'output':'count-2-out'
      },
      'count-both':{
        'node': __dirname + '/../examples/nodes/count',
        'input':['ping-1-out','ping-2-out'],
        'output':'count-both-out'
      }
    }, function(err, res){
      topo.destroy(function(){
        test.done();
      });
    });
  },

  'merge': function(test) {
    var topo = new Topology({
      'ping':{
        'node': __dirname + '/../examples/nodes/ping',
        'output':'ping-out'
      },
      'count':{
        'node': __dirname +'/../examples/nodes/count',
        'input':'ping-out',
        'output':'count-out'
      },
      'oddeven':{
        'node': __dirname +'/../examples/nodes/oddeven',
        'field': 'count',
        'input':'count-out',
        'output':'oddeven-out',
        'outputs': {'odd':'odd','even':'even'}
      },
      'print':{
        'node': __dirname + '/../examples/nodes/print',
        'input':['odd', 'even']
      }
    }, function(err, res){
      topo.destroy(function(){
        test.done();
      });
    });
  }

};
