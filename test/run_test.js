"use strict";

var fork = require('child_process').fork;

var child;

exports['run'] = {
  'run': function(test) {

    var run;

    var node = {
      id: 'test',
      node: '../examples/nodes/thru.js',
      input: ['test-to-node'],
      output: ['test-from-node']
    };

    var opts = {
    };

    opts.redis = {
      host: '127.0.0.1',
      port: 6379,
      prefix: 'straw-test'
    };

    var onMessage = function(data){
      //console.log('MESSAGE: ', data);

      if(data === 'INITIALIZED'){
        child.send('START');
      }

      if(data === 'STARTED'){
        child.send('QUIT');
      }

      if(data === 'QUIT'){
        test.done();
      }

    };


    var onStdout = function(data){
      console.log('STDOUT:  ', data.toString().trim());
    };

    var onStderr = function(data){
      console.log('STDERR:  ', data.toString().trim());
    };
    
    child = fork(
      __dirname + '/../lib/run.js', [
        JSON.stringify(node), 
        JSON.stringify(opts)
      ], {silent: true}
    );

    child.on('message', onMessage);
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);  

  }
  
};
