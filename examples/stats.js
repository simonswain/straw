var straw = require('../lib/straw.js');

var cls = function(){
  process.stdout.write('\u001B[2J\u001B[0;0f');
};

var opts = {
  nodes_dir: __dirname + '/nodes',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-example'
  }};

opts.logging = {
  silent: true
}


var topo = straw.create(opts);

topo.add([{
  id: 'ping',
  node: 'ping',
  output:'ping-out' 
}, {
  id: 'count',
  node: 'count',
  input: 'ping-out',
  output:'count-out' 
},{
  id: 'print',
  node: 'print',
  input: 'count-out'
}], function(){
  topo.start({
    purge: true
  });
});

var stats = function(){
  topo.stats(function(err, data){
    cls();
    console.log(new Date());
    console.log(data);
  });
};


var interval = setInterval(stats, 1000);

process.on( 'SIGINT', function() {
  clearInterval(interval);
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
