"use strict";

var Runner = require('../lib/runner.js');
var redis = require('redis');

exports['runner'] = {
  setUp: function(callback) {
    this.__log = console.log;
    console.log = function(){};
    callback();
  },
  tearDown: function(callback) {
    console.log = this.__log;
    callback();
  },
  'new': function(test) {
    test.expect(3);

    var runner;

    var def = { 
      key: 'run-test',
      node: __dirname + '/../examples/nodes/passthru',
      input:[{key:'test-in'}],
      output:[{key:'test-out'}]
    };

    var test_msg = '{"foo":"bar"}';

    var redisIn = redis.createClient();
    var redisOut = redis.createClient();

    redisIn.on('message', function(channel, msg){
      msg = JSON.parse(msg);      
      test.equal( channel, def.output[0].key, 'Correct channel received');
      test.deepEqual( msg, test_msg, 'Test message was passed thru');

      redisIn.quit();
      redisOut.quit();
      runner.stop(function(){
        test.done();      
      });
    }).subscribe(def.output[0].key);


    var send = function() {
      console.log('sending');
     redisOut.publish(def.input[0].key, JSON.stringify(test_msg));      
    };
   
    runner = new Runner (
      def,
      {},      
      function(err) {
        test.equal(err, false, 'No error from starting runner');
        // give child time to start
        setTimeout(send, 20);
      });    

  }
  
};
