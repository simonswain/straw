var straw = require('../lib/straw.js');

var opts = {
  nodes_dir: __dirname + '/nodes',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-example'
  }};

var topo = straw.create(opts);

topo.add([{
  id: 'ping-1',
  node: 'ping',
  output: 'ping-1-out'
}, {
  id: 'ping-2',
  node: 'ping',
  output: 'ping-2-out'
}, {
  id: 'count-1',
  node: 'count',
  input: 'ping-1-out',
  output: 'count-1-out'
}, {
  id: 'count-2',
  node: 'count',
  input: 'ping-2-out',
  output: 'count-2-out'
}, {
  id: 'count-both',
  node: 'count',
  input: ['count-1-out','count-2-out'],
  output: 'count-both-out'
}, {
  id: 'print',
  node: 'print',
  input: 'count-both-out'
}], function(){
  topo.start({purge: true});
});

process.on( 'SIGINT', function() {
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
