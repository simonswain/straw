var redis = require('redis');
var redisIn = redis.createClient();
var redisOut = redis.createClient();
var redisStats = redis.createClient();
var statsd = require('node-statsd').StatsD;

var config = require('../config/config.js');

function Run() {

  var self = this;

  // worker node to run
  var f = process.argv[2];

  var opts = JSON.parse(process.argv[3]);

  // dummy for when statsd not enabled
  var stat = function(key){};

  var statsdClient;
  var statsKey;

  // if enabled, configure statsd
  if ( typeof config.statsd !== 'undefined' ) {

    statsKey = config.statsd.prefix ? (config.statsd.prefix + '.') : '';
    statsKey += opts.key;

    statsdClient = new statsd(
      config.statsd.host,
      config.statsd.port
    );

    stat = function(key){
      statsdClient.increment(statsKey + '.' + key);
    };

  }

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
      stat('output');
    } else if ( opts.outputs[outlet] !== undefined ) {
      redisOut.publish(opts.outputs[outlet], JSON.stringify(msg));
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
      stat('input');
      stat('inputs.' + channel);
    });

    for (var i = 0; i < opts.input.length; i++ ) {
      redisIn.subscribe(opts.input[i]);
    }

  }

  node.run();

  process.send('STARTED');

}

module.exports = new Run();
