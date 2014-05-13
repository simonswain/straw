"use strict";

var Runner = require('../lib/runner.js');
var redis = require('redis');

var opts = {
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-test'
  }};


// init

// start, stop

// start, stop, start

// initialize, start, reboot

exports['runner'] = {
  'init-quit': function(test) {

    var runner;

    //test.expect(3);
    var node = {
      id: 'test',
      node: __dirname + '/../examples/nodes/thru2.js',
      input: ['test-to-node'],
      output: ['test-from-node']
    };

    runner = new Runner (
      node,
      opts,
      function(err, pid) {
        //console.log('PID', pid);
        runner.quit(function(){
          test.done();      
        });
      });
  },
  'init-start-quit': function(test) {

    var runner;

    // start a runner, wait for it to emit a message via Redis then
    // quit.

    //test.expect(3);

    var node = {
      id: 'ping',
      node: __dirname + '/../examples/nodes/ping2.js',
      //input: ['test-to-node'],
      output: ['test-from-node']
    };

    var pipe = opts.redis.prefix + ':' + node.output[0];

    //var redisIn = redis.createClient();
    var redisFromNode = redis.createClient();

    var finished = function(){
      runner.quit(function(){ 
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

    runner = new Runner (
      node,
      opts,
      function(err, pid) {
        runner.start(function(){
          brpop();
        });
      });
  }
  
};
