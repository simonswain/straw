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

    } else if (self.opts.outputs[outlet] !== undefined) {

      // outlet specified and exists, send it out that one
      self.output(clients, self.opts.outputs[outlet], msg);
      stat('outputs.' + outlet);
    }

  });

  // receive command from controlling process
  process.on('message', function(data){
    if ( data === 'STOP' ) {
      node.stop( function() {
        node = null;
        process.send('STOPPED');
        process.exit(0);
      });
      return;
    }
  });

  node.on('count', function(counts){
    clients.out.publish('stats:' + def.key, JSON.stringify(counts));
  });

  // pipes will push to this redis channel

  this.brpop = function() {
    var self = this;
    clients.pop.brpop(this.lkeys, function(err, reply){
      var msg = JSON.parse(reply[1]);
      node.process(msg);
      self.brpop();
    });
  };

  // convert to array if not. this is how we subscribe to multiple
  // pipes

  if ( def.input !== undefined ) {

    if ( ! Array.isArray(def.input)) {
      def.input = [def.input];
    }

    clients.sub.on('message', function(channel, msg){
      msg = JSON.parse(msg);
      node.process(msg);
      stat('input');
      stat('inputs.' + channel);
    });

    // subscribe to fan-out pipes (redis pubsub)

    this.lkeys = [];

    def.input.forEach(function(x){
      if ( typeof x.mode === 'undefined' ) {
        clients.sub.subscribe(x.key);
        return;
      }

      // build list of round-robin keys.
      if ( x.mode === 'round-robin' ) {
        self.lkeys.push(x.key);
        return;
      }
    });

    if (this.lkeys.length > 0) {
      this.lkeys.push(60);
      this.brpop();
    }

  }

  node.run();

  process.send('STARTED');

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
