var straw = require('../lib/straw.js');

var topo = straw.createTopology();


// add one

// topo.add({
//   id: 'ping',
//   node: __dirname + '/nodes/ping',
//   output:'ping-out' 
// });

// add multiple

topo.add([{
  id: 'ping',
  node: __dirname + '/nodes/ping',
  output:'ping-out' 
}, {
  id: 'thru',
  node: __dirname + '/nodes/passthru',
  input:'ping-out',
  output:'passthru-out'
}]);

// stop and remove node from topo
topo.remove('xxx');

topo.start(function(){
  // starts nodes processing
  console.log('started');
});

topo.stop(function(){
  // stops node processing after their current message
  console.log('started');
});

topo.destroy(function(){
  // stops then destroys all nodes
  console.log('destroyed');
});

// show stats

topo.structure(function(structure){
  console.log(structure);
});

topo.stats(function(err, stats){
  console.log(stats);
});




// or

var topo = straw.createTopology({
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
