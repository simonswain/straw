var straw = require('../lib/straw.js');

//                        / count \
// ping -> oddeven [odd] x         + print-me
//                        \ count /

var topo = new straw.topology({
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
  }
});

process.on( 'SIGINT', function() {
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
