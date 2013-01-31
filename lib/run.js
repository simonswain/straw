"use strict";

var redis = require('redis'), clients;
var Statsd = require('node-statsd').StatsD;

function Run() {

  var self = this;

  var node_f, Node, node, def, opts;

  // worker node to run
  node_f = process.argv[2];
  this.def = def = JSON.parse(process.argv[3]);
  this.opts = opts = JSON.parse(process.argv[4]);

  if (typeof opts.redis === 'undefined') {
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  clients = {
    sub: redis.createClient(opts.redis),
    pop: redis.createClient(opts.redis),
    out: redis.createClient(opts.redis)
  };


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

  Node = require(node_f);
  node = new Node(def);

  if ( def.output === undefined ) {
    def.output = [];
  }

  if ( def.outputs === undefined ) {
    def.outputs = {};
  }

  // connected pipes will be subscribed to this
  node.on('message', function(data){

    var outlet = data.outlet || false;
    var msg = data.message;

    if ( ! outlet ) {     
      // no outlet specified? send it out the default
      self.def.output.forEach( function(x){
        self.output(clients, x, msg);
      });
      stat('output');
    } else if (self.def.outputs[outlet] !== undefined) {
      // outlet specified and exists, send it out that one
      self.output(clients, self.def.outputs[outlet], msg);
      stat('outputs.' + outlet);
    }

  });

  // receive command from controlling process
  process.on('message', function(data){
    if ( data === 'STOP' ) {
      for(var i in clients){
        clients[i].quit();
      }
      node.stop( function() {
        process.exit();
      });
    }
  });

  node.on('count', function(counts){
    clients.out.publish('stats:' + def.key, JSON.stringify(counts));
  });

  // pipes will push to this redis channel. process must execute the
  // callback to signal it's ready to process another message

  this.brpop = function() {
    var self = this;
    clients.pop.brpop(this.lkeys, function(err, reply){
      var msg = JSON.parse(reply[1]);
      node.process(msg, function(err){
        stat('input');
        //stat('inputs.' + channel);
        self.brpop();
      });
    });
  };

  // set up pipes them run the node

  var run = function() {
    node.run(function(err){
      process.send('STARTED');
    });
  };

  if ( def.input === undefined ) {
    return run();
  }

  clients.sub.on('message', function(channel, msg){
    msg = JSON.parse(msg);
    node.process(msg, function(err, res){
      stat('input');
      stat('inputs.' + channel);
    });
  });


  var remaining = 0;
  var complete = function(){
    remaining --;
    if (remaining === 0) {
      run();
    }
  };

  if ( ! Array.isArray(def.input)) {
    def.input = [def.input];
  }

  // subscribe to fan-out pipes (redis pubsub)

  this.lkeys = [];
  def.input.forEach(function(x){
    if ( typeof x.mode === 'undefined' ) {
      // redis takes time to subscribe
      remaining ++;
      clients.sub.subscribe(x.key, complete);
      return;
    }

    // build list of round-robin keys.
    if ( x.mode === 'round-robin' ) {
      self.lkeys.push(x.key);
      return;
    }
  });

  // last element is polling timeout
  if (this.lkeys.length > 0) {
    this.lkeys.push(60);
    this.brpop();
  }

  remaining ++;
  complete();

}

Run.prototype.output = function(clients, pipe, msg) {

  // default, fan-out. clients will subscribe
  if ( typeof pipe.mode === 'undefined' ) {
    clients.out.publish(
      pipe.key,
      JSON.stringify(msg)
    );
    return;
  }

  // round-robin. clients will brpop
  if ( pipe.mode === 'round-robin' ) {
    clients.out.lpush(
      pipe.key,
      JSON.stringify(msg)
    );
    return;
  }

  // no valid pipe type specified

};


module.exports = new Run();
