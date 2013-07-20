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

  if(!opts.hasOwnProperty('redis')){
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  if(!opts.redis.hasOwnProperty('prefix')){
    opts.redis.prefix = 'straw';
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

  var prefix = opts.redis.prefix + ':';
  
  // use purge:false to retain messages in queues across restarts
  if(!opts.hasOwnProperty('purge') || opts.purge){
    _.each(topo, function(node){

      if(node.hasOwnProperty('input')){
        var input = node.input;
        if (!Array.isArray(input)) {
          input = [input];
        }
        _.each(input, function(x){
          client.del(prefix + x);
        });
      }

      if(node.hasOwnProperty('inputs')){
        _.each(node.inputs, function(x){
          client.del(prefix + x);
        });
      }

      if(node.hasOwnProperty('output')){
        var output = node.output;
        if (!Array.isArray(output)) {
          output = [output];
        }
        _.each(output, function(x){
          client.del(prefix + x);
        });
      }

      if(node.hasOwnProperty('outputs')){
        _.each(node.outputs, function(x){
          client.del(prefix + x);
        });
      }

    });
  }

  client.quit();

  // pull nodes from the topo and tell them about their pipes

  /*jshint loopfunc:true */
  for ( tkey in topo ) {

    if (!topo[tkey].hasOwnProperty('node')) {
      continue;
    }

    def = topo[tkey];

    // expand default input to include pipe definitions
    if ( typeof def.input === 'undefined' ) {
      def.input = [];
    } else {
      if (!Array.isArray(def.input)) {
        def.input = [def.input];
      }
    }

    // expand default outputs to include pipe definitions
    if (typeof def.output !== 'undefined' ) {
      if ( ! Array.isArray(def.output)) {
        def.output = [def.output];
      }
    } else {
      def.output = [];
    }

    if (!def.hasOwnProperty('outputs')) {
      def.outputs = {};
    }

    nodes[tkey] = topo[tkey];
    nodeCount = nodeCount + 1;
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
      finished(false);
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
    runner.stop(function(){
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
