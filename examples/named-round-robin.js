var straw = require('../lib/straw.js');

//                        / count \
// ping -> oddeven [odd] x         + print-me
//                        \ count /

var opts = {
  nodes_dir: __dirname + '/nodes',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-example'
  }};

var topo = straw.create(opts);

topo.add([{
  id: 'ping',
  node: 'ping',
  output: 'ping-out'
}, {
  id: 'count',
  node: 'count',
  input: 'ping-out',
  output: 'count-out'
}, {
  id: 'oddeven',
  node: 'oddeven',
  field: 'count',
  input: 'count-out',
  output: 'oddeven-out',
  outputs: {'odd':'odd','even':'even'}
}, {
  id: 'print-odd-1',
  node: 'print',
  input: 'odd'
}, {
  id: 'print-odd-2',
  node: 'print',
  input: 'odd'
}, {
  id: 'print-even',
  node: 'print',
  input: 'even'
}], function(){
  topo.start({purge: true});
});

process.on( 'SIGINT', function() {
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
