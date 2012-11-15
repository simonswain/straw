var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

// [ping] -> [passsthru] -> [count]

topo = new straw.topology({
  'ping':{
    'node':'../examples/nodes/ping',
    'output':'ping-out'
  },
  'thru':{
    'node':'../examples/nodes/passthru',
    'input':'ping-out',
    'output':'passthru-out'
  },
  'count':{
    'node':'../examples/nodes/count',
    'input':'passthru-out',
    'output':'count-out'
  }
};

counts.on('message', function(channel, msg){
  msg = JSON.parse(msg);
  console.log(msg);
}).subscribe('count-out');

var topo = new straw.topology(map, function(err, res){
  console.log('Topology Created');
});
