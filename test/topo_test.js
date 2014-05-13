"use strict";

var fork = require('child_process').fork;
var redis = require('redis');

var opts = {
  nodes_dir: __dirname + '/../examples/nodes',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-test'
  }};

var straw = require('../lib/straw.js');

exports['topo'] = {
  'create': function(test) {

    var topo = straw.create({
      nodes_dir: __dirname + '/../examples/nodes'
    });

    // add one

    topo.add({
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    }, function(){
      topo.destroy(function(){ 
        test.done();
      });
    });
  },
  'create-same-error': function(test) {

    var topo = straw.create({
      nodes_dir: __dirname + '/../examples/nodes'
    });

    // add two with the same id
    topo.add([{
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    }, {
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    }], function(){
      topo.destroy(function(){ 
        test.done();
      });
    });
  },

  'create-flow-start-receive-quit': function(test) {

    var pipe = opts.redis.prefix + ':thru-out';
    var topo = straw.create(opts);
    var redisFromNode = redis.createClient();

    var finished = function(){
      topo.destroy(function(){ 
        redisFromNode.quit();
        test.done();      
      });
    };

    var brpop = function(){
      var lkeys = [pipe, 5];
      redisFromNode.brpop(
        lkeys, 
        function(err, reply){
          test.equal(reply[0], pipe);
          var msg = JSON.parse(reply[1]);
          test.ok(msg.hasOwnProperty('ping'));
          finished();
        });
    };

    topo.add([{
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    },{
      id: 'thru',
      node: 'thru2',
      input:'ping-out',
      output:'thru-out' 
    }], function(){
      topo.start(function(){
        brpop();       
      });
    });

  },
  'create-flow-start-stop-start-quit': function(test) {

    var pipe = opts.redis.prefix + ':thru-out';
    var topo = straw.create(opts);

    var go = function(){
      topo.start(function(){
        topo.stop(function(){
          topo.start(function(){
            topo.destroy(function(){
              test.done();
            });
          });
        });
      });
    };

    topo.add([{
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    },{
      id: 'thru',
      node: 'thru2',
      input:'ping-out',
      output:'thru-out' 
    }], function(){
      go();
    });

  },

  'purge': function(test) {

    var pipe = opts.redis.prefix + ':thru-out';
    var topo = straw.create(opts);

    var go = function(){
      topo.purge(function(){
        topo.destroy(function(){
          test.done();
        });
      });
    };

    topo.add([{
      id: 'ping',
      node: 'ping2',
      output:'ping-out' 
    },{
      id: 'thru',
      node: 'thru2',
      input:'ping-out',
      output:'thru-out' 
    }], function(){
      go();
    });

  }
  
  //purge
};
