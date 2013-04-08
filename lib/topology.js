"use strict";

var fs = require('fs');

var redis = require('redis');
var _ = require('underscore');

var Runner = require('./runner.js');
var pad = require('./pad');

var Topology = function (topo) {

  var done, opts;

  opts = {};

  if ( typeof arguments[2] === 'function' ) {
    done = arguments[2];
  } else if ( typeof arguments[1] === 'function' ) {
    done = arguments[1];
  }

  if ( typeof arguments[1] === 'object' ) {
    opts = arguments[1];
  }

  if(!opts.hasOwnProperty('pidsfile')){
    opts.pidsfile = false;
  }

  this.__nodes = {};
  this.__runners = {};

  this.start = function(){
    this.create(
      topo, 
      opts, 
      function(err, pids){

        if(opts.pidsfile){
          fs.writeFileSync(opts.pidsfile, JSON.stringify(pids));
        }

        if(done && typeof done === 'function'){
          done(err);
        }
      });
  };


  // try to kill dangling processes from a previous run

  if(opts.pidsfile && fs.existsSync(opts.pidsfile)) {
    var pids = JSON.parse(fs.readFileSync(opts.pidsfile));

    _.each(pids, function(pid){
      try{
      process.kill(pid, 'SIGHUP');
      } catch (err){
        // catch error if no process
        //console.log(err);
      }
    });
  }

  this.start();
  
};

/*
* extract nodes and pipes from supplied Topo
*/
Topology.prototype.create = function(topo, opts, done) {

  var self = this;

  var pkey, tkey, skey, def, i, x;

  var pipes = {};
  var nodes = {};

  var nodeCount = 0;

  var pids = {};

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

  client.quit();

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
      if ( typeof def.inputs !== 'undefined' && Object.prototype.toString.call(def.inputs) === '[object Object]') { 
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

      // expand named outputs to include pipe definitions
      if ( typeof def.outputs !== 'undefined' && Object.prototype.toString.call(def.outputs) === '[object Object]') { 
        for(i in def.outputs){
          x = def.outputs[i];
          if ( typeof pipes[x] !== 'undefined') { 
            // configured pipe
            def.outputs[i] = pipes[x];
          } else {
            // default pipe (fan out, redis pubsub)
            def.outputs[i] = {key: x};
          }
        }
      }

      nodes[tkey] = topo[tkey];
      nodeCount = nodeCount + 1;

    }
  }
  /*jshint loopfunc:false */

  // spawn the nodes. wait until they are ready before callback
  var finished = function(err) {
    nodeCount = nodeCount - 1;
    if ( nodeCount === 0 ) {
      console.log(pad.timestamp(), 'TOPOLOGY STARTED');
      if(done && typeof done === 'function'){
        done(false, pids);
      }
    }
  };

  _.each(nodes, function(node, skey) {
    self.spawn(skey, node, opts, function(err, res){
      pids[skey] = res.pid;
      finished (false);
    });
  });

};

// create new node runner
Topology.prototype.spawn = function(key, def, opts, done) {

  def.key = key;
  this.__nodes[key] = def;
  opts = opts || {};
  this.__runners[key] = new Runner (
    def,
    opts,
    function(err, pid) {
      done(err, pid);
    });

};

// create new node runner
Topology.prototype.destroy = function(done) {

  var self = this;

  var skey;
  var nodeCount = 0;

  var finished = function(err) {
    nodeCount = nodeCount - 1;
    if ( nodeCount === 0 && typeof done !== 'undefined' ) {
      console.log(pad.timestamp(), 'TOPOLOGY STOPPED');
      if(done && typeof done === 'function'){
        done(false);
      }
    }
  };

  var kill = function(skey, runner, finished) {
    return runner.stop(function(){
      self.__runners[skey] = null;
      finished();
    });
  };

  for ( skey in this.__runners ) {
    nodeCount ++;
    kill(skey, this.__runners[skey], finished);
  }

};

module.exports = Topology;
