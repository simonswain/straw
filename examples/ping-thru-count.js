var straw = require('../lib/straw.js');

// [ping] -> [thru] -> [count] -> [print]

var topo = new straw.topology({
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
  },
  'print':{
    'node':  __dirname + '/../examples/nodes/print',
    'input':'count-out'
  }
});

process.on( 'SIGINT', function() {
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
