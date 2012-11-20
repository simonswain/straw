var fs = require('fs');
var util = require('util');
var events = require('events');
var fork = require('child_process').fork;

var _ = require('underscore')._;

function zeropad( number, width ) {
  width = width || 2;
  width -= number.toString().length;
  if ( width > 0 )  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number;
}

function spacepad( s, width ) {
  var x;
  width = width || 32;
  s = s.substr(0, width).trim();
  x = width - s.length;
  if (x === 0) {
    return s;
  }
  return s + new Array(x + 1).join(' ');
}

function Runner ( def, opts, done ) {

  events.EventEmitter.call(this);
  process.setMaxListeners(0);

  var self = this;

  this.debug = true;
  this.restarting = false;
  this.stopping = false;

  this.logFile = false;

  var child;

  this.start = function() {

    self.stopping = false;

    console.log(self.timestamp(), 'STARTING', def.key);

    child = fork(
      __dirname + '/run.js',
      [def.node, JSON.stringify(def), JSON.stringify(opts)],
      {silent: true}
    );

    if ( typeof def.log !== 'undefined' ) {
      self.logFile = def.log;
    }

    child.on('message', this.onMessage);

    child.stdout.on('data', function(data){

      var s = data.toString().trim();

      if ( s === '') {
        return;
      }

      var x = s.split("\n");

      if (x.length === 0) {
        return;
      }
      
      var t = self.timestamp();
      var log = [];
      for ( var i=0, ii = x.length; i < ii ; i++) {

        if ( self.debug ) {
          console.log(
            t,
            'STDOUT  ',
            spacepad(def.key, 20),
            x[i]);
        }
        log.push(t + ' ' + x[i], "\n");
      }

      if ( self.logFile && log.length > 0 ) {
        fs.appendFile(def.log, log.join(''));
      }
      
    });

    child.stderr.on('data', function(data){
      if ( self.debug ) {
        console.log(
          self.timestamp(),
          'STDERR  ',
          spacepad(def.key, 20),
          data.toString().trim()
        );
      }
    });

    child.on('exit', function(code) {
      if ( self.debug ) {
        console.log(
          self.timestamp(),
          'EXITED  ',
          spacepad(def.key, 20),
          code
        );
      }
      if ( ! self.stopping ) {
        self.start();
      }
    });

  };

  this.restart = function() {
    self.restarting = true;
    self.stop();
  };

  this.stop = function() {
    if ( ! child ) {
      return;
    }
    self.stopping = true;
    child.send('STOP');
  };

  this.kill = function(done) {
    if ( ! child ) {
      return done();
    }
    child.kill();
    if ( done ) {
      return done();
    }
  };

  this.onMessage = function(data){
    // control messages are not stringified json

    if ( data === 'STARTED' ) {
      console.log(self.timestamp(),  'STARTED ', def.key);
      return;
    }

    if ( data === 'STOPPED' ) {
      child.kill();
      if ( self.restarting ) {
        console.log(self.timestamp(),  'RESTART ', def.key);
        self.start();
        self.restarting = false;
      }
      return;
    }

    console.log(self.timestamp(), 'MESSAGE ', spacepad(def.key, 20), data);
    self.emit('message', data);
  };

  // fs.watch reports multiple times, so debounce this
  this.fileChanged = _.debounce(function (event, filename) {
    self.restart();
  }, 100);

  fs.watch (def.node, this.fileChanged);

  process.on('exit', function() {
    child.kill();
  });

  this.timestamp = function() {
    var d = new Date();
    var s;
    s = d.getFullYear();
    s += '-' + zeropad(d.getMonth()+1);
    s += '-' + zeropad(d.getDate());
    s += ' ' + zeropad(d.getHours());
    s += ':' + zeropad(d.getMinutes());
    s += ':' + zeropad(d.getSeconds());
    return s;
  };

  this.start();

  if ( done ) {
    done();
  }

}

util.inherits(Runner, events.EventEmitter);

module.exports = Runner;
