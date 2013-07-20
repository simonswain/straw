var straw = require('../lib/straw.js');

var topo = new straw.topology({
  'ping':{
    'node': __dirname + '/../examples/nodes/ping',
    'output':'ping-out'
  },
  'count':{
    'node': __dirname + '/../examples/nodes/count',
    'input':'ping-out',
    'output':'count-out'
  },
  'print':{
    'node': __dirname + '/../examples/nodes/print',
    'input':'count-out'
  }
},{
  'purge': true
});
