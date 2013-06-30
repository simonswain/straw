"use strict";

var redis = require('redis');
var _ = require('underscore');

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

  // one redis client for this, one for the node
  this.clients = {
    io: redis.createClient(opts.redis),
    node: redis.createClient(opts.redis)
  };
  
  Node = require(node_f);
  node = new Node(def);

  // give node a redis client to play with if it needs one. pass in
  // the prefix so it can keep it's keys namespaced.

  node.redis = {
    client: this.clients.node,
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

  if ( def.outputs === undefined ) {
    def.outputs = {};
  }

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
      });
      return;
    }

    if (self.def.outputs.hasOwnProperty(outlet)) {
      self.clients.io.lpush(prefix + self.def.outputs[outlet], JSON.stringify(message) );
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

  this.brpop = function() {
    var self = this;
    self.clients.io.brpop(self.lkeys, function(err, reply){
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

  // set up pipes then run the node

  // if only one input, arrayize it. if multiple inputs are provided,
  // they will already be in an array
  if (!Array.isArray(def.input)) {
    def.input = [def.input];
  }

  this.lkeys = [];
  def.input.forEach(function(x){
    self.lkeys.push(prefix + x);
  });

  // last element is polling timeout
  if (this.lkeys.length > 0) {
    this.lkeys.push(60);
    // start pulling data from the pipes
    this.brpop();
  }

  node.run(function(err){
    process.send('STARTED');
  });

}

module.exports = new Run();
