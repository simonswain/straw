"use strict";

var fs = require('fs');
var util = require('util');
var events = require('events');
var fork = require('child_process').fork;
var _ = require('underscore')._;
var pad = require('./pad');


function Runner (def, opts, done) {

  events.EventEmitter.call(this);
  process.setMaxListeners(0);

  var self = this;

  this.debug = true;
  this.watch = true;
  this.logFile = false;
  this.restarting = false;
  this.stopping = false;

  var prefix = 'straw';

  if(opts.hasOwnProperty('redis') && opts.redis.hasOwnProperty('prefix')){
    prefix = opts.redis.prefix;
  }

  var child;

  this.start = function(done) {

    // startedCallback is called on STARTED from child process
    self.startedCallback = done;

    if ( typeof def.log !== 'undefined' ) {
      self.logFile = def.log;
    }

    self.stopping = false;

    child = fork(
      __dirname + '/run.js',
      [def.node, JSON.stringify(def), JSON.stringify(opts)],
      {silent: true}
    );

    child.on('exit', this.onChildExit);
    child.on('message', this.onMessage);

    child.stdout.on('data', this.onStdout);
    child.stderr.on('data', this.onStderr);

  };

  this.onChildExit = function(code) {
    if ( self.debug ) {
      console.log(
        pad.timestamp(),
        'EXITED  ',
        pad.space(def.key, 20),
        code
      );
    }

    child.removeAllListeners();
    child = null;

    if (self.stoppedCallback) {
      return self.stoppedCallback();
    }

    if (!self.stopping) {
      self.start();
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
    for ( var i=0, ii = x.length; i < ii ; i++) {

      if ( self.debug ) {
        console.log(
          t,
          'STDOUT  ',
          pad.space(def.key, 20),
          x[i]);
      }
      log.push(t + ' ' + x[i], "\n");
    }

    if ( self.logFile && log.length > 0 ) {
      fs.appendFile(def.log, log.join(''));
    }
  };

  this.onStderr = function(data){
    if ( self.debug ) {
      console.log(
        pad.timestamp(),
        'STDERR  ',
        pad.space(def.key, 20),
        data.toString().trim()
      );
    }
  };

  this.restart = function() {
    self.restarting = true;
    self.stop(function(){
      self.start();
    });
  };

  this.stop = function(done) {
    if (!child) {
      return done();
    }
    self.stoppedCallback = done;
    self.stopping = true;
    child.send('STOP');
  };

  this.kill = function(done) {
    if ( ! child ) {
      return done();
    }
    self.stoppedCallback = done;
    child.kill();
  };

  this.onMessage = function(data){
    // control messages are not stringified json

    if ( data === 'STARTED' ) {
      console.log(pad.timestamp(),  'STARTED ', child.pid, def.key);
      if (typeof self.startedCallback === 'function'){
        self.startedCallback(false, {pid:child.pid});
        self.startedCallback = null;
      }
      return;
    }

    if ( data === 'INITIALIZED') {
      console.log(pad.timestamp(),  'INIT    ', child.pid, def.key);
      return;
    }
    
    
    if ( data === 'STOPPED' ) {
      child.removeAllListeners();
      child.kill('SIGKILL');
      child.disconnect();
      child = null;
      return;
    }
    
    console.log(pad.timestamp(), 'MESSAGE ', pad.space(def.key, 20), data);
    self.emit('message', data);
  };

  this.onDisconnect = function() {
    console.log(pad.timestamp(),  'STOPPED ', def.key);
    if ( self.stoppedCallback) {
      return self.stoppedCallback();
    }

    if ( self.restarting ) {
      console.log(pad.timestamp(),  'RESTART ', def.key);
      self.restarting = false;
      self.start();
    }
  };

  if (this.watch){
    // fs.watch reports multiple times, so debounce this
    this.fileChanged = _.debounce(function (event, filename) {
      self.restart();
    }, 100);

    // disable persistent so process doesn't star after being killed
    fs.watch (
      def.node,
      {persistent: false},
      this.fileChanged
    );
  }

  this.start(done);

}

util.inherits(Runner, events.EventEmitter);

module.exports = Runner;
