var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

topo = new straw.topology({
  'ping':{
    'node': __dirname +'/../examples/nodes/ping',
    'output':'ping-out'
  },
  'count-1':{
    'node': __dirname +'/../examples/nodes/count-me',
    'input':'ping-out',
    'output':'count-out'
  },
  'count-2':{
    'node': __dirname +'/../examples/nodes/count-me',
    'input':'ping-out',
    'output':'count-out'
  },
  'print':{
    'node': __dirname + '/../examples/nodes/print',
    'input':['count-out']
  },
  'ping-out': {
    'pipe': 'round-robin'
  },

});
