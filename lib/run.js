var redis = require('redis');
var redisIn = redis.createClient();
var redisOut = redis.createClient();
var redisStats = redis.createClient();

function Run() {

  var self = this;

  // worker node to run
  var f = process.argv[2];

  var opts = JSON.parse(process.argv[3]);

  var Node, node;
  Node = require( f );
  node = new Node(opts);

  if ( opts.outputs === undefined ) {
    opts.outputs = {};
  }

  // connected pipes will be subscribed to this
  node.on('message', function(data){

    var outlet = data.outlet || false;
    var msg = data.message;

    if ( ! outlet ) {
      redisOut.publish(opts.output, JSON.stringify(msg));
    } else if ( opts.outputs[outlet] !== undefined ) {
      redisOut.publish(opts.outputs[outlet], JSON.stringify(msg));
    }
  });

  // receive command from controlling process
  process.on('message', function(data){
    if ( data === 'STOP' ) {
      node.stop( function() {
        node = null;
        process.send('STOPPED');
      });
      return;
    }
  });

  node.on('count', function(counts){
    redisStats.publish('stats:' + opts.key, JSON.stringify(counts));
  });
  
  // pipes will push to this redis channel

  // convert to array if not. this is how we subscribe to multiple
  // pipes

  if ( opts.input !== undefined ) {

    if ( ! Array.isArray(opts.input)) {
      opts.input = [opts.input];
    }

    redisIn.on('message', function(channel, msg){
      msg = JSON.parse(msg);
      node.process(msg);
    });

    for (var i = 0; i < opts.input.length; i++ ) {
      redisIn.subscribe(opts.input[i]);
    }

  }

  node.run();

  process.send('STARTED');

}

module.exports = new Run();
