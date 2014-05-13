"use strict";

var fs = require('fs');
var util = require('util');
var events = require('events');
var fork = require('child_process').fork;
var _ = require('underscore');
var pad = require('./pad');

function Runner (node, opts, done) {

  var self = this;

  events.EventEmitter.call(this);

  this.node = node;
  this.opts = opts;

  // create a fake logger if none provided
  if(!this.opts.logger){
    this.opts.logger = {
      log: console.log
    };
  }
  
  this.child = null;

  this.restarting = false;
  this.quitting = false;

  this.watch = true;

  this.startCallback = null;
  this.stopCallback = null;
  this.quitCallback = null;
  this.killedCallback = null;

  /*
   * create child process and initialize node in it
   */
  this.initialize = function(done) {

    // called on INITIALIZED from child process
    self.initializedCallback = done;

    self.child = fork(
      __dirname + '/run.js', [
        JSON.stringify(self.node), 
        JSON.stringify(self.opts)
      ], {silent: true}
    );
    
    // add event handlers to child

    // child process dies unexpectedly
    self.child.on('exit', self.onChildExit);

    // childcommunicates with us
    self.child.on('message', self.onMessage);

    // child output
    self.child.stdout.on('data', self.onStdout);
    self.child.stderr.on('data', self.onStderr);
  };

  // handle child process exiting
  this.onChildExit = function(code) {

    self.opts.logger.log(
      'info', 
      pad.timestamp(), 
      'EXITED  ', 
      pad.space(self.node.id, 20),
      code
    );

    self.child.removeAllListeners();
    self.child = null;

    if (self.killedCallback) {
      console.log('KILLED');
      return self.killedCallback();
    }

    // reboot node -- it died!
    if (!self.quitting) {
      self.initialize();
    }

  };

  this.onStdout = function(data){

    var s = data.toString().trim();

    if ( s === '') {
      return;
    }

    var x = s.split("\n");

    if (x.length === 0) {
      return;
    }

    var t = pad.timestamp();
    var log = [];
    for (var i=0, ii=x.length; i<ii; i++) {
      self.opts.logger.log(
        'info', 
        t, 
        'STDOUT  ', 
        pad.space(self.node.id, 20), 
        x[i]
      );
    }
  };

  this.onStderr = function(data){
    self.opts.logger.log(
      'info', 
      pad.timestamp(), 
      'STDERR  ', 
      pad.space(self.node.id, 20), 
      data.toString().trim()
    );
  };

  /*
   * methods for controlling child process
   */

  this.start = function(done) {
    // done called when STARTED message received child
    self.startedCallback = done;
    self.quitting = false;
    // tell node to start
    self.child.send('START');
  };

  // stop self-managed execution in node
  this.stop = function(done) {
    if (!self.child) {
      return done();
    }
    self.stoppedCallback = done;
    self.child.send('STOP');
  };

  // terminate child process
  this.quit = function(done) {
    if (!self.child) {
      return done();
    }
    self.quitCallback = done;
    self.quitting = true;
    self.child.send('QUIT');
  };

  // force terminate child process
  this.kill = function(done) {
    if (!self.child ) {
      return done();
    }
    self.stoppedCallback = done;
    self.child.kill();
  };


  this.restart = function() {
    self.restarting = true;
    self.quit(function(){
      self.initialize();
    });
  };


  // message received from child
  this.onMessage = function(data){
    // control messages are not stringified json

    //console.log('FROM NODE TO RUNNER GOT', data);

    if (data === 'INITIALIZED') {
      self.opts.logger.log(
        'info', 
        pad.timestamp(),  
        'INIT    ', 
        self.node.id,
        self.child.pid
      );

      if (typeof self.initializedCallback === 'function'){
        self.initializedCallback(
          false, {
            pid:self.child.pid
          });
        self.initializedCallback = null;
      }
    }   
    
    if (data === 'STARTED') {
      self.opts.logger.log(
        'info', 
        pad.timestamp(),  
        'STARTED ', 
        self.node.id
      );
      if (typeof self.startedCallback === 'function'){
        self.startedCallback();
        self.startedCallback = null;
      }
    }

    if (data === 'STOPPED') {
      if (typeof self.stoppedCallback === 'function'){
        self.stoppedCallback();
        self.stoppedCallback = null;
      }
    }

    if (data === 'QUIT') {
      self.child.removeAllListeners();
      self.child.kill('SIGKILL');
      self.child.disconnect();
      self.child = null;
      if(self.quitCallback){
        self.quitCallback();
      }
    }
    
    // anything else is data

    self.opts.logger.log(
      'info', 
      pad.timestamp(), 
      'MESSAGE ', 
      pad.space(self.node.id, 20), data);

    //self.emit('message', data );

  };

  this.onDisconnect = function() {

    self.opts.logger.log('info', pad.timestamp(),  'DISCONNECTED - STOPPED ', self.node.id);
    if ( self.stoppedCallback) {
      return self.stoppedCallback();
    }

    if (self.restarting) {
      self.opts.logger.log('info', pad.timestamp(),  'DISCONNECTED - RESTART ', self.node.id);
      self.restarting = false;
      self.start();
    }
  };

  if (this.watch){
    // fs.watch reports multiple times, so debounce this
    this.fileChanged = _.debounce(function (event, filename) {
      self.restart();
    }, 100);

    // disable persistent so process doesn't start after being killed
    fs.watch (
      self.node.node,
      {persistent: false},
      this.fileChanged
    );
  }

  this.initialize(done);

}

util.inherits(Runner, events.EventEmitter);

module.exports = Runner;
