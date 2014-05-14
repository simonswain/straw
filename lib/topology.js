"use strict";

var fs = require('fs');
var winston = require('winston');
var redis = require('redis');
var _ = require('underscore');
var async = require('async');

var Runner = require('./runner.js');
var pad = require('./pad');

var Topology = function (opts) {

  this.opts = opts;

  this.pipes = {};
  this.nodes = {};
  this.runners = {};

  // try to kill dangling processes from a previous run

  if(this.opts.pidsfile && fs.existsSync(this.opts.pidsfile)) {
    var pids = JSON.parse(fs.readFileSync(this.opts.pidsfile));
    _.each(pids, function(pid){
      try{
        process.kill(pid, 'SIGHUP');
      } catch (err){
        // catch error if no process
        //logger.log('info', err);
      }
    });
  }

  return this;

};

Topology.prototype.addPipe = function(id) {
  if(!this.pipes.hasOwnProperty(id)){
    this.pipes[id] = {
      id: id,
      outputs: [],
      inputs: []
    };
  }
};

Topology.prototype.addPipeOut = function(pipe_id, node_id) {
  this.addPipe(pipe_id);
  this.pipes[pipe_id].outputs.push(node_id);
};

Topology.prototype.addPipeIn = function(pipe_id, node_id) {
  this.addPipe(pipe_id);
  this.pipes[pipe_id].inputs.push(node_id);
};

/*
 * Add a node to the topology by spawning it in it's own process. The
 * Runner takes care of setting up the process and starting the node
 * in it.
 */
Topology.prototype.add = function(node, done) {

  var self = this;

  // array of nodes was given
  if (Array.isArray(node)) {
    return async.eachSeries(node, function(x, next){
      Topology.prototype.add.call(self, x, next);
    }, function(){
      return done && done();
    });
  }

  if(this.opts.nodes_dir){
    node.node = this.opts.nodes_dir + '/' + node.node + '.js';
  }

  if(this.nodes.hasOwnProperty(node.id)){
    this.opts.logger.log(
      'info', 
      pad.timestamp(),  
      'ADD FAIL', 
      node.id,
      'ALREADY EXISTS'
    );
    return done(new Error('Node ID already exists'));
  }

  this.opts.logger.log(
    'info', 
    pad.timestamp(),  
    'ADD     ', 
    node.id
  );

  //this.opts.logger.log('info', 'Adding Node %s', node.id);

  // if(!fs.existsSync(node.node)) {
  //   return done(new Error('Node file not found'));
  // }

  // create references to the pipes this node uses. Actual plumbing is
  // done using Redis, but we keep account of it here so we can pull
  // stats and otherwise control pipes, e.g. purge them

  // input
  if(!node.hasOwnProperty('input')){
    node.input = [];
  }

  // this node receives input from `pipe`. Input can be received from
  // many pipes. If a single key was supplied, convert to array.
  if (!Array.isArray(node.input)) {
    node.input = [node.input];
  }

  // out of pipe, to this node
  _.each(node.input, function(x){
    self.addPipeOut(x, node.id);
  });

  // default output
  if(!node.hasOwnProperty('output')){
    node.output = [];
  }

  // default output can go to many pipes. if a single key was
  // provided, convert to array.
  if (!Array.isArray(node.output)) {
    node.output = [node.output];
  }

  // out of node, to these pipes
  _.each(node.output, function(x){
    self.addPipeIn(x, node.id);
  });

  // named outputs
  if(!node.hasOwnProperty('outputs')){
    node.outputs = {};
  }

  // each named output can go to many pipes. If a single key was
  // supplied, convert to array.
  _.each(node.outputs, function(x, id){
    if (!Array.isArray(x)) {
      node.outputs[id] = [x];
    }    
  });

  // out of pipe, to this node
  _.each(node.outputs, function(outputs){
    _.each(outputs, function(x){
      self.addPipeIn(x, node.id);
    });
  });

  this.nodes[node.id] = node;

  this.runners[node.id] = new Runner (
    node,
    this.opts,
    function(err, pid) {
      if(done){
        return done(err, pid);
      }
    });

};

// start all nodes in the topo
Topology.prototype.start = function(done) {
  var self = this;
  var opts = {};
  
  if (typeof arguments[0] === 'object'){
    opts = arguments[0];
    done = arguments[1];
  }

  if(!opts.hasOwnProperty('purge')){
    opts.purge = false;
  }

  var purge = function(next){
    if(!opts.purge){
      return next();
    }
    self.purge(function(){
      next();
    });
  };

  var start = function(next){
    async.each(
      _.toArray(self.runners), 
      function(runner, next){
        runner.start(next);
      }, function(){
        self.opts.logger.log(
          'info', 
          pad.timestamp(),  
          'TOPOLOGY',
          'STARTED '
        );
        next();
      });
  };

  async.series([
    purge,
    start
  ], function(){
    if(done && typeof done === 'function'){
      done();
    }
  });

};

// stop all nodes in the topo
Topology.prototype.stop = function(done) {
  var self = this;
  async.eachSeries(
    _.toArray(this.runners), 
    function(runner, next){
      runner.stop(next);
    }, function(){
      self.opts.logger.log(
        'info', 
        pad.timestamp(),  
        'TOPOLOGY',
        'STOPPED '
      );
      if(done && typeof done === 'function'){
        done();
      }
    });
};

// remove messages from all pipes
Topology.prototype.purge = function(done) {

  var prefix = this.opts.redis.prefix + ':';
  var client = redis.createClient(this.opts.redis);

  var self = this;

  async.each(
    _.toArray(this.pipes), 
    function(pipe, next){

      // FYI how many elements in the pipe
      client.llen(
        prefix + pipe.id, 
        function(err, length){

          self.opts.logger.log(
            'info', 
            pad.timestamp(),  
            'PIPE    ',
            pipe.id + ' ' + length
          );

          // remove all elements from pipe
          client.del(
            prefix + pipe.id, 
            function(err, length){
              next();
            });
          
        });

    }, function(){
      
      client.quit();

      self.opts.logger.log(
        'info', 
        pad.timestamp(),  
        'TOPOLOGY',
        'PURGED'
      );

      if(done && typeof done === 'function'){
        done();
      }
    });

};

// quit all the nodes in the topology
Topology.prototype.destroy = function(done) {

  var self = this;

  async.each(
    _.toArray(this.runners), 
    function(runner, next){
      runner.quit(next);

    }, function(){

      self.opts.logger.log(
        'info', 
        pad.timestamp(),  
        'TOPOLOGY',
        'DESTROYED'
      );

      if(done && typeof done === 'function'){
        done();
      }
    });

};

var create = function(){

  var opts;

  opts = {};

  if ( typeof arguments[0] === 'object' ) {
    opts = arguments[0];
  }

  if(!opts.hasOwnProperty('pidsfile')){
    opts.pidsfile = false;
  }

  if(!opts.hasOwnProperty('nodes_dir')){
    opts.nodes_dir = false;
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

  if(!opts.hasOwnProperty('logger')){

    var transports = [];
    if(opts.hasOwnProperty('log_f')){
      transports.push(new (winston.transports.File)({ filename: 'somefile.log' }));
    } else {
      transports.push(new (winston.transports.Console)());
    }

    opts.logger = new (winston.Logger)({
      transports: transports
    });
    
  }

  var topo = new Topology(opts);

  return topo;

};

module.exports = {
  create: create
};




// /*
// * extract nodes and pipes from supplied Topo
// */
// Topology.prototype.create = function(topo, opts, done) {

//   var self = this;

//   var pkey, tkey, skey, def, i, x;

//   var pipes = {};
//   var nodes = {};

//   var nodeCount = 0;

//   var pids = {};


//   var client = redis.createClient();

//   client.on("error", function (err) {
//     self.opts.logger.log('info', err);
//     process.exit(0);
//   });

//   // pull pipes from the topo map

//   var prefix = opts.redis.prefix + ':';

//   // use purge:false to retain messages in queues across restarts
//   if(!opts.hasOwnProperty('purge') || opts.purge){
//     _.each(topo, function(node){

//       if(node.hasOwnProperty('input')){
//         var input = node.input;
//         if (!Array.isArray(input)) {
//           input = [input];
//         }
//         _.each(input, function(x){
//           client.del(prefix + x);
//         });
//       }

//       if(node.hasOwnProperty('inputs')){
//         _.each(node.inputs, function(x){
//           client.del(prefix + x);
//         });
//       }

//       if(node.hasOwnProperty('output')){
//         var output = node.output;
//         if (!Array.isArray(output)) {
//           output = [output];
//         }
//         _.each(output, function(x){
//           client.del(prefix + x);
//         });
//       }

//       if(node.hasOwnProperty('outputs')){
//         _.each(node.outputs, function(x){
//           client.del(prefix + x);
//         });
//       }

//     });
//   }

//   client.quit();

//   // pull nodes from the topo and tell them about their pipes

//   /*jshint loopfunc:true */
//   for ( tkey in topo ) {

//     if (!topo[tkey].hasOwnProperty('node')) {
//       continue;
//     }

//     def = topo[tkey];

//     // expand default input to include pipe definitions
//     if ( typeof def.input === 'undefined' ) {
//       def.input = [];
//     } else {
//       if (!Array.isArray(def.input)) {
//         def.input = [def.input];
//       }
//     }

//     // expand default outputs to include pipe definitions
//     if (typeof def.output !== 'undefined' ) {
//       if ( ! Array.isArray(def.output)) {
//         def.output = [def.output];
//       }
//     } else {
//       def.output = [];
//     }

//     if (!def.hasOwnProperty('outputs')) {
//       def.outputs = {};
//     }

//     nodes[tkey] = topo[tkey];
//     nodeCount = nodeCount + 1;
//   }

//   /*jshint loopfunc:false */

//   // spawn the nodes. wait until they are ready before callback
//   var finished = function(err) {
//     nodeCount = nodeCount - 1;
//     if ( nodeCount === 0 ) {
//       self.opts.logger.log('info', pad.timestamp(), 'TOPOLOGY STARTED');
//       if(done && typeof done === 'function'){
//         done(false, pids);
//       }
//     }
//   };

//   _.each(nodes, function(node, skey) {
//     self.spawn(skey, node, opts, function(err, res){
//       pids[skey] = res.pid;
//       finished(false);
//     });
//   });

// };

