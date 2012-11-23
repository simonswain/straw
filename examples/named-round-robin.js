var straw = require('../lib/straw.js');
var redis = require('redis');
var counts = redis.createClient();
var topo;

//                        / count \
// ping -> oddeven [odd] x         + print-me
//                        \ count /

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
  'oddeven':{
    'node': __dirname +'/../examples/nodes/oddeven',
    'field': 'count',
    'input':'count-out',
    'output':'oddeven-out',
    'outputs': {'odd':'odd','even':'even'}
  },
  'print-odd-1':{
    'node': __dirname +'/../examples/nodes/print',
    'input':'odd'
  },
  'print-odd-2':{
    'node': __dirname +'/../examples/nodes/print',
    'input':'odd'
  },
  'print-even':{
    'node': __dirname +'/../examples/nodes/print',
    'input':'even'
  },
  'odd': {
    'pipe': 'round-robin'
  },

});
