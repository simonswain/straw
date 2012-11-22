var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

counts.on('message', function(channel, msg){
  msg = JSON.parse(msg);
  console.log(msg);
}).subscribe('count-out');

// [ping] -> [thru] -> [count]

topo = new straw.topology({
  'ping':{
    'node': __dirname + '/nodes/ping',
    'output':'ping-out'
  },
  'thru':{
    'node': __dirname + '/nodes/passthru',
    'input':'ping-out',
    'output':'passthru-out'
  },
  'count':{
    'node': __dirname + '/nodes/count',
    'input':'passthru-out',
    'output':'count-out'
  }
});

