var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

topo = new straw.topology({
  'ping':{
    'node': __dirname +'/../examples/nodes/ping',
    'output':'ping-out'
  },
  'count':{
    'node': __dirname +'/../examples/nodes/count',
    'input':'ping-out',
    'output':'count-out'
  },
  'worker-1':{
    'node': __dirname +'/../examples/nodes/heavy-lifting',
    'input':'ping-out',
    'output':'done-out'
  },
  'jobs-sent':{
    'node': __dirname + '/../examples/nodes/print',
    'input':['count-out']
  },
  'job-done':{
    'node': __dirname + '/../examples/nodes/print',
    'input':['done-out']
  },
  'ping-out': {
    'pipe': 'round-robin'
  },

});
