"use strict";

var redis = require('redis');
var _ = require('underscore');
var Statsd = require('node-statsd').StatsD;

function Run() {

  var self = this;

  var node_f, Node, node, def, opts, prefix;

  // worker node to run
  node_f = process.argv[2];

  // definition of node
  this.def = def = JSON.parse(process.argv[3]);

  // options for this instance
  this.opts = opts = JSON.parse(process.argv[4]);

  // if no redis settings provided, use defaults
  if (typeof opts.redis === 'undefined') {
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  if(!opts.redis.hasOwnProperty('prefix')){
    opts.redis.prefix = 'straw';
  }

  prefix = opts.redis.prefix + ':';

  // one redis client for run.js to use to communicate with the rest
  // of the topollgy, and one for the node to use however it wants.

  this.clients = {
    io: false,
    node: false
  };

  // catching errors here means node-redis will try to reconnect if
  // the Redis server has issues

  this.clients.io = redis.createClient(opts.redis.port, opts.redis.host);

  this.clients.io.on('error', function(err){
    console.log(err, 'run.js io client');
  });

  this.clients.node = redis.createClient(opts.redis.port, opts.redis.host);

  this.clients.node.on('error', function(err){
    console.log(err, 'run.js node client');
  });


  // dummy for when statsd not enabled
  var stat = function(key){};

  var statsdClient;
  var statsKey;

  // if enabled, configure statsd
  if ( typeof opts.statsd !== 'undefined' ) {

    statsKey = opts.statsd.prefix ? (opts.statsd.prefix + '.') : '';
    statsKey += def.key;

    statsdClient = new Statsd(
      opts.statsd.host,
      opts.statsd.port
    );

    stat = function(key){
      statsdClient.increment(statsKey + '.' + key);
    };

  }

  var start = function(){

    // give node a redis client to play with if it needs one. pass in
    // the prefix so it can keep it's keys namespaced.

    node.redis = {
      client: self.clients.node,
      prefix: opts.redis.prefix
    };

    if ( def.input === undefined ) {
      def.input = [];
    }

    if ( def.inputs === undefined ) {
      def.inputs = [];
    }

    if ( def.output === undefined ) {
      def.output = [];
    }

    if(!_.isArray(def.output)){
      def.output = [def.output];
    }

    if ( def.outputs === undefined ) {
      def.outputs = {};
    }

    // allow multiple pipes for each named outlet
    _.each(def.outputs, function(x, i){
      def.outputs[i] = (_.isArray(x)) ? x : [x];
    });

    // node emits a message -- send to outlet(s)
    node.on('message', function(data){

      var outlet, message;

      if(!data.hasOwnProperty('message') || !data.message){
        // no message, nothing to do
        return false;
      }

      message = data.message;

      outlet = false;

      if(data.hasOwnProperty('outlet') && data.outlet){
        outlet = data.outlet;
      }

      if (!outlet) {
        // no outlet specified - send out the default(s)
        self.def.output.forEach(function(x){
          self.clients.io.lpush(prefix + x, JSON.stringify(message) );
          stat('output');
          stat('output:' + x);
        });
        return;
      }

      if (self.def.outputs.hasOwnProperty(outlet)) {
        _.each(self.def.outputs[outlet], function(x){
          self.clients.io.lpush(prefix + x, JSON.stringify(message) );
          stat('output:' + x);
        });
        stat('output');
      }
    });

    // receive command from controlling process
    process.on('message', function(data){
      if ( data === 'STOP' ) {
        self.clients.io.quit();
        self.clients.node.quit();
        node.stop(function() {
          process.exit();
        });
      }
    });

    // pipes will push to this redis channel. process must execute the
    // callback to signal it's ready to process another message

    self.brpop = function() {
      self.clients.io.brpop(self.lkeys, function(err, reply){
        if(err){
          //console.log(err);
          setTimeout(self.brpop, 1000);
          //self.brpop();
          return;
        }
        if (!reply){
          // brpop timed out
          self.brpop();
          return;
        }
        var msg = false;
        if(!err){
          try {
            msg = JSON.parse(reply[1]);
          } catch (e) {
            // bad json
            self.brpop();
            return;
          }
          node.process(msg, function(err){
            stat('input');
            self.brpop();
          });
        }
      });
    };

    // set up pipes then run the node

    // if only one input, arrayize it. if multiple inputs are provided,
    // they will already be in an array
    if (!Array.isArray(def.input)) {
      def.input = [def.input];
    }

    self.lkeys = [];
    def.input.forEach(function(x){
      self.lkeys.push(prefix + x);
    });

    // last element is polling timeout
    if (self.lkeys.length > 0) {
      self.lkeys.push(1);
      // start pulling data from the pipes
      self.brpop();
    }

    node.on('count', function(counts){
      self.clients.io.publish(prefix + 'stats:' + def.key, JSON.stringify(counts));
    });

    node.run(function(err){
      process.send('STARTED');
    });

  };

  Node = require(node_f);
  node = new Node(def, function(){
    process.send('INITIALIZED');
    start();
  });

}

module.exports = new Run();
