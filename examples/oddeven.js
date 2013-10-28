var straw = require('../lib/straw.js');

var topo = new straw.topology({
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
});
