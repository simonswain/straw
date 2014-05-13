"use strict";

var _ = require('underscore');
var redis = require('redis');
var async = require('async');

function Run() {

  var self = this;

  var Node, node, prefix;

  this.running = false;
  this.stoppedCallback = null;

  if(!process.argv[2]){
    // needs to be run as a child process
    console.log('no node definition provided');
    return;
  }

  // node definition
  this.node = JSON.parse(process.argv[2]);

  if(!process.argv[3]){
    // needs to be run as a child process
    console.log('no options provided');
    return;
  }

  // straw options from topology
  this.opts = JSON.parse(process.argv[3]);

  prefix = this.opts.redis.prefix + ':';

  // one redis client for run.js to use to communicate with the rest
  // of the topollgy, and one for the node to use however it wants.

  this.clients = {
    io: false,
    node: false
  };

  // catching errors here means node-redis will try to reconnect if
  // the Redis server has issues

  this.clients.io = redis.createClient(this.opts.redis);

  this.clients.io.on('error', function(err){
    console.log(err, 'run.js io client');
  });

  this.clients.node = redis.createClient(this.opts.redis);

  this.clients.node.on('error', function(err){
    console.log(err, 'run.js node client');
  });

  // give the node a redis client to use with if it needs one. pass
  // in the prefix so it can keep it's keys namespaced.
  
  this.node.redis = {
    client: this.clients.node,
    prefix: this.opts.redis.prefix
  };

  // inbound pipes will push to this redis channel. process must
  // execute the callback to signal it's ready to process another
  // message

  this.lkeys = false;

  if(this.node.input){
    this.lkeys = []; 
   this.node.input.forEach(function(x){
      self.lkeys.push(prefix + x);
    });
    // last element is polling timeout for Redis (1 second)
    this.lkeys.push(1);
  }

  // Node is the worker node to run -- this has been created with
  // straw.node({def}) and exported

  Node = require(this.node.node);

  // create an instance of the worker node, passing in pipe names,
  // redis client, options

  node = new Node(this.node);

  // when node emits a message distribute it to the appropriate pipes

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
      self.node.output.forEach(function(x){
        self.clients.io.lpush(prefix + x, JSON.stringify(message) );
      });
      return;
    }

    if (self.node.outputs.hasOwnProperty(outlet)) {
      _.each(self.node.outputs[outlet], function(x){
        self.clients.io.lpush(prefix + x, JSON.stringify(message) );
      });
    }
  });

  node.on('count', function(counts){
    //self.clients.io.publish(prefix + 'stats:' + self.node.id, JSON.stringify(counts));
  });

  // get the node to set itself up
  node.initialize(this.node, function(){
    process.send('INITIALIZED');
  });

  // receive command from controlling process (runner.js)
  process.on('message', function(data){

    if ( data === 'START' ) {
      if(self.running){
        // already running
        return;
      }
      process.send('STARTING');
      self.start();
    }

    if ( data === 'STOP' ) {
      // tell the node to stop any self-managed processing it does
      // when the current message is finished processsing or long-poll
      // stops on the queue then we're done
      process.send('STOPPING');
      async.parallel([
        node.stop,
        self.stop
      ], function(){
        self.stoppedCallback = null;
        process.send('STOPPED');
      });
    }

    if ( data === 'QUIT' ) {
      process.send('QUITTING');
      async.parallel([
        node.stop,
        self.stop
      ], function(){
        self.stoppedCallback = null;
        self.clients.io.quit();
        self.clients.node.quit();
        process.send('STOPPED');
        process.send('QUIT');
        process.exit(0);
      });
    }

  });

  this.stop = function(done){

    if(!self.running){
      return done();
    }

    if(!self.lkeys){
      // no polling to do -- we're done
      self.running = false;
      return done();
    }

    self.stoppedCallback = function(){
      done();
    };

    // let brpop know we want to stop
    self.running = false;
  };

  this.start = function(){
    self.running = true;
    // get the node to start any self-managed processing it does
    node.start(function() {
      process.send('STARTED');
    });
    // start consuming messages from inbound pipes connected to this
    // node

    // if there is at least one input (last element in lkeys is Redis
    // polling timeout, so length > 1) then star polling
    // start pulling data from the pipes
    self.brpop();
  };

  this.brpop = function() {
    // lkeys will be false if no inbound pipes
    if(!self.lkeys){
      return;
    }
    if(!self.running){
      if (self.stoppedCallback){
        return self.stoppedCallback();
      }
      return;
    }
    self.clients.io.brpop(self.lkeys, function(err, reply){
      if(err){
        // console.log('info', err);
        // error -- hold off for a second then try again
        setTimeout(self.brpop, 1000);
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
          self.brpop();
        });
      }
    });
  };

}

module.exports = new Run();
