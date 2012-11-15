var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

counts.on('message', function(channel, msg){
  msg = JSON.parse(msg);
  console.log(msg);
}).subscribe('count-both-out');

topo = new straw.topology({
  'ping-1':{
    'node': __dirname + '/../examples/nodes/ping',
    'output':'ping-1-out'
  },
  'ping-2':{
    'node':  __dirname + '/../examples/nodes/ping',
    'output':'ping-2-out'
  },
  'count-1':{
    'node':  __dirname + '/../examples/nodes/count',
    'input':'ping-1-out',
    'output':'count-1-out'
  },
  'count-2':{
    'node':  __dirname + '/../examples/nodes/count',
    'input':'ping-2-out',
    'output':'count-2-out'
  },
  'count-both':{
    'node':  __dirname + '/../examples/nodes/count',
    'input':['ping-1-out','ping-2-out'],
    'output':'count-both-out'
  },
});

