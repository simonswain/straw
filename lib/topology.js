var Runner = require('./runner.js');
var redis = require('redis');

var Topology = function (topo) {

  var done, opts;

  if ( typeof arguments[2] === 'function' ) {
    done = arguments[2];
  } else if ( typeof arguments[1] === 'function' ) {
    done = arguments[1];
  }

  if ( typeof arguments[1] === 'object' ) {
    opts = arguments[1];
  }

  this.__nodes = {};
  this.create(topo, opts, function(err, res){
    if ( done ) {
      done(false, false);
    }
  });

};

Topology.prototype.create = function(topo, opts, done) {

  var pkey, tkey, skey, def, i, x;

  var pipes = {};
  var nodes = {};

  var nodeCount = 0;

  var client = redis.createClient();

  // pull pipes from the topo map

  for ( pkey in topo ) {
    if ( typeof topo[pkey].pipe !== 'undefined' ) {
      pipes[pkey] = {
        key: pkey,
        mode: topo[pkey].pipe
      };      
      // use purge:false to retain messages in queues across restarts
      if (typeof topo[pkey].purge === 'undefined' || topo[pkey].purge) {
        client.del(pkey);
      }
    }
  }

  // pull nodes from the topo map and tell them about their pipes

  /*jshint loopfunc:true */
  for ( tkey in topo ) {
    if ( typeof topo[tkey].node !== 'undefined' ) {

      def = topo[tkey];

      // expand default input to include pipe definitions
      if ( typeof def.input !== 'undefined' ) { 
        if ( ! Array.isArray(def.input)) {
          def.input = [def.input];
        }
        def.input.forEach(function(x, i) {
          if ( typeof pipes[x] !== 'undefined' ) { 
            // configured pipe
            def.input[i] = pipes[x];
          } else {
            // default pipe (fan out, redis pubsub)
            def.input[i] = {key: x};
          }
        });
      }      

      // expand named inputs to include pipe definitions
      if ( typeof def.inputs !== 'undefined' && toString.call(def.inputs) === '[object Object]') { 
        for(i in def.inputs){
          x = def.inputs[i];
          if ( typeof pipes[x] !== 'undefined') { 
            // configured pipe
            def.inputs[i] = pipes[x];
          } else {
            // default pipe (fan out, redis pubsub)
            def.inputs[i] = {key: x};
          }
        }
      }
      
      // expand default outputs to include pipe definitions
      if ( typeof def.output !== 'undefined' ) { 
        if ( ! Array.isArray(def.output)) {
          def.output = [def.output];
        }
        def.output.forEach(function(x, i) {
          if ( typeof pipes[x] !== 'undefined' ) { 
            // configured pipe
            def.output[i] = pipes[x];
          } else {
            // default pipe (fan out, redis pubsub)
            def.output[i] = {key: x};
          }
        });
      }      

      // expand named inputs to include pipe definitions
      if ( typeof def.inputs !== 'undefined' && toString.call(def.inputs) === '[object Object]') { 
        for(i in def.inputs){
          x = def.inputs[i];
          if ( typeof pipes[x] !== 'undefined') { 
            // configured pipe
            def.inputs[i] = pipes[x];
          } else {
            // default pipe (fan out, redis pubsub)
            def.inputs[i] = {key: x};
          }
        }
      }

      nodes[tkey] = topo[tkey];
      nodeCount = nodeCount + 1;

    }
  }
  /*jshint loopfunc:false */



  var finished = function(err, res) {
    nodeCount = nodeCount - 1;
    if ( nodeCount === 0 ) {
      if ( done ) {
        done(false, null);
      }
    }
  };

  for ( skey in nodes ) {
    this.spawn(skey, nodes[skey], opts, finished);
  }

};

// create new node runner
Topology.prototype.spawn = function(key, def, opts, done) {

  def.key = key;
  this.__nodes[key] = def;

  opts = opts || {};

  def.runner = new Runner (
    def,
    opts,
    function(err, res) {
      if ( done ) {
        done(false, null);
      }
    });

};

module.exports = Topology;
