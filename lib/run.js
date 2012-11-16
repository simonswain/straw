var redis = require('redis');
var statsd = require('node-statsd').StatsD;

function Run() {

  var self = this;

  var node_f, Node, node, def, opts;

  // worker node to run
  node_f = process.argv[2];
  def = JSON.parse(process.argv[3]);
  opts = JSON.parse(process.argv[4]);

  if (typeof opts.redis === 'undefined') {
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  var redisIn = redis.createClient(opts.redis);
  var redisOut = redis.createClient(opts.redis);
  var redisStats = redis.createClient(opts.redis);

  // dummy for when statsd not enabled
  var stat = function(key){};

  var statsdClient;
  var statsKey;

  // if enabled, configure statsd
  if ( typeof opts.statsd !== 'undefined' ) {

    statsKey = opts.statsd.prefix ? (opts.statsd.prefix + '.') : '';
    statsKey += def.key;

    statsdClient = new statsd(
      opts.statsd.host,
      opts.statsd.port
    );

    stat = function(key){
      statsdClient.increment(statsKey + '.' + key);
      //console.log('COUNT', statsKey + '.' + key);
    };

  }

  Node = require(node_f);
  node = new Node(def);

  if ( def.outputs === undefined ) {
    def.outputs = {};
  }

  // connected pipes will be subscribed to this
  node.on('message', function(data){

    var outlet = data.outlet || false;
    var msg = data.message;

    if ( ! outlet ) {
      redisOut.publish(def.output, JSON.stringify(msg));
      stat('output');
    } else if ( def.outputs[outlet] !== undefined ) {
      redisOut.publish(def.outputs[outlet], JSON.stringify(msg));
      stat('outputs.' + outlet);
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
    redisStats.publish('stats:' + def.key, JSON.stringify(counts));
  });

  // pipes will push to this redis channel

  // convert to array if not. this is how we subscribe to multiple
  // pipes

  if ( def.input !== undefined ) {

    if ( ! Array.isArray(def.input)) {
      def.input = [def.input];
    }

    redisIn.on('message', function(channel, msg){
      msg = JSON.parse(msg);
      node.process(msg);
      stat('input');
      stat('inputs.' + channel);
    });

    for (var i = 0; i < def.input.length; i++ ) {
      redisIn.subscribe(def.input[i]);
    }

  }

  node.run();

  process.send('STARTED');

}

module.exports = new Run();
