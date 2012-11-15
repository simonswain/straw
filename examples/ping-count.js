var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

counts.on('message', function(channel, msg){
  msg = JSON.parse(msg);
  console.log(msg);
}).subscribe('count-out');

topo = new straw.topology({
  'ping':{
    'node': __dirname +'/../examples/nodes/ping',
    'output':'ping-out'
  },
  'count':{
    'node': __dirname +'/../examples/nodes/count',
    'input':'ping-out',
    'output':'count-out'
  }
});

