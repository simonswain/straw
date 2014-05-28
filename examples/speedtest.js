var straw = require('../lib/straw.js');

var redis = {
  host: '127.0.0.1',
  port: 6379,
  prefix: 'straw-example'
};

var opts = {
  nodes_dir: __dirname + '/nodes',
  redis: redis,
}


// uses a feedback look to test how fast messages can move through a
// topology
  
var trigger = straw.tap({
  output: 'count-in',
  redis: redis
});

var topo = straw.create(opts);

topo.add([{
  id: 'count',
  node: 'count',
  input: 'count-in',
  output: ['thru-in'] 
},{
  id: 'thru',
  node: 'thru',
  input: 'thru-in',
  output: 'count-in'
}], function(){
  topo.start({
    purge: true
  }, function(){
    trigger.output({ping: new Date().getTime()});
  });
});

var c = 0;

var stats = function(){
  topo.stats(function(err, data){
    var av = (data.nodes.count.output - c);
    c = data.nodes.count.output;
    console.log('messages: ' + c + ' (' + av + '/s)');
    
  });
};



var interval = setInterval(stats, 1000);

process.on( 'SIGINT', function() {
  clearInterval(interval);
  trigger.destroy();
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});
