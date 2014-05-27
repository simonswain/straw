"use strict";

var redis = require('redis');
var _ = require('underscore');

var eventSplitter = /\s+/;

var Tap = function(opts) {

  var self = this;

  if(!opts){
    opts = {};
  }

  this.opts = opts;

  if(!opts.hasOwnProperty('redis')){
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  if(!opts.redis.hasOwnProperty('prefix')){
    opts.redis.prefix = 'straw';
  }

  var prefix = this.opts.redis.prefix + ':';

  this.clients = {
    input: false,
    output: false,
  };

  // we need two clents, since the input client will be blocked
  // waiting for messages from the inbound pipe
  this.clients.input = redis.createClient(opts.redis);
  this.clients.output = redis.createClient(opts.redis);

  if(!opts.hasOwnProperty('input')){
    opts.input = [];
  }

  if (!Array.isArray(opts.input)) {
    opts.input = [opts.input];
  }

  // default output
  if(!opts.hasOwnProperty('output')){
    opts.output = [];
  }

  // default output can go to many pipes. if a single key was
  // provided, convert to array.
  if (!Array.isArray(opts.output)) {
    opts.output = [opts.output];
  }

  // named outputs
  if(!opts.hasOwnProperty('outputs')){
    opts.outputs = {};
  }

  // each named output can go to many pipes. If a single key was
  // supplied, convert to array.
  _.each(opts.outputs, function(x, id){
    if (!Array.isArray(x)) {
      opts.outputs[id] = [x];
    }
  });


  // inbound pipes will push to this redis channel. handler function
  // must execute the callback to signal it's ready to process another
  // message

  this.lkeys = false;

  if(this.opts.input){
    this.lkeys = [];
   this.opts.input.forEach(function(x){
      self.lkeys.push(prefix + x);
    });
    // last element is polling timeout for Redis (1 second)
    this.lkeys.push(1);
  }


  this.start = function(){
    self.running = true;

    // if there is at least one input (last element in lkeys is Redis
    // polling timeout, so length > 1) then star polling
    // start pulling data from the pipes
    self.brpop();
  };

  this.stop = function(done){

    if(!self.running){
      return done();
    }

    if(!self.lkeys){
      // no polling to do -- we're done
      self.running = false;
      return done();
    }

    self.stoppedCallback = function(){
      done();
    };

    // let brpop know we want to stop
    self.running = false;
  };

  this.brpop = function() {

    // lkeys will be false if no inbound pipes
    if(!self.lkeys){
      return;
    }
    if(!self.running){
      if (self.stoppedCallback){
        return self.stoppedCallback();
      }
      return;
    }
    self.clients.input.brpop(self.lkeys, function(err, reply){
      if(err){
        //console.log('info', err);
        // error -- hold off for a second then try again
        setTimeout(self.brpop, 1000);
        return;
      }
      if (!reply){
        // brpop timed out
        self.brpop();
        return;
      }
      var msg = false;
      if(!err){
        try {
          msg = JSON.parse(reply[1]);
        } catch (e) {
          // bad json
          self.brpop();
          return;
        }
        self.emit('message', msg);
        self.brpop();
      }
    });
  };

  this.start();

  this.send = function() {    
    
    var outlet = false;
    var message;
    var done = function(){};

    // output a message, optionally on a named outlet
    //
    // output ([outlet,] message [, done])

    if ( arguments.length === 1 ) {
      message = arguments[0];
    }

    if ( arguments.length === 2 ) {
      // message, done
      if ( typeof arguments[1] === 'function' ){
        message = arguments[0];
        done = arguments[1];
      } else {
        outlet = arguments[0];
        message = arguments[1];
      }
    }

    if ( arguments.length === 3 ) {
      outlet = arguments[0];
      message = arguments[1];
      done = arguments[2];
    }

    if (!outlet) {     
      // no outlet specified - send out the default(s)
      self.opts.output.forEach(function(x){
        self.clients.output.lpush(opts.redis.prefix + ':' + x, JSON.stringify(message) );
      });
      return done(false);
    }

    if (self.opts.outputs.hasOwnProperty(outlet)) {
      self.clients.output.lpush(opts.redis.prefix + ':' + self.opts.outputs[outlet], JSON.stringify(message) );
      return done(false);
    }

  };


};

Tap.prototype.destroy = function(done) {
  _.each(this.clients, function(x){
    x.quit();
  });
  if (typeof done === 'function') {
    done(false);
  }
};


Tap.prototype.on = function(events, callback, context) {
  var calls, event, list;
  if ( ! callback ) {
    return this;
  }

  events = events.split(eventSplitter);
  calls = this._callbacks || (this._callbacks = {});

  while (event = events.shift()) {
    list = calls[event] || (calls[event] = []);
    list.push(callback, context);
  }

  return this;
};

Tap.prototype.off = function(events, callback, context) {
  var event, calls, list, i;

  // No events, or removing *all* events.
  if ( ! ( calls = this._callbacks ) ) {
    return this;
  }

  if ( ! ( events || callback || context ) ) {
    delete this._callbacks;
    return this;
  }

  events = events ? events.split(eventSplitter) : _.keys(calls);

  // Loop through the callback list, splicing where appropriate.
  while (event = events.shift()) {
    if (!(list = calls[event]) || !(callback || context)) {
      delete calls[event];
      continue;
    }

    for (i = list.length - 2; i >= 0; i -= 2) {
      if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
        list.splice(i, 2);
      }
    }
  }

  return this;
};

Tap.prototype.emit = function(events) {
  var event, calls, list, i, length, args, all, rest;
  if ( ! ( calls = this._callbacks ) ) {
    return this;
  }

  rest = [];
  events = events.split(eventSplitter);

  // Fill up `rest` with the callback arguments.  Since we're only copying
  // the tail of `arguments`, a loop is much faster than Array#slice.
  for (i = 1, length = arguments.length; i < length; i++) {
    rest[i - 1] = arguments[i];
  }

  // For each event, walk through the list of callbacks twice, first to
  // trigger the event, then to trigger any `"all"` callbacks.
  while (event = events.shift()) {
    // Copy callback lists to prevent modification.
    if (all = calls.all) {
      all = all.slice();
    }

    if (list = calls[event]) {
      list = list.slice();
    }

    // Execute event callbacks.
    if (list) {
      for (i = 0, length = list.length; i < length; i += 2) {
        list[i].apply(list[i + 1] || this, rest);
      }
    }

    // Execute "all" callbacks.
    if (all) {
      args = [event].concat(rest);
      for (i = 0, length = all.length; i < length; i += 2) {
        all[i].apply(all[i + 1] || this, args);
      }
    }
  }

  return this;
};


Tap.extend = function(protoProps) {

  var parent = this;
  var child;

  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  //_.extend(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;

  child.prototype = new Surrogate();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.

  /*jslint nomen: false*/
  if (protoProps) {
    _.extend(child.prototype, protoProps);
  }
  /*jslint nomen: true*/

  // Set a convenience property in case the parent's prototype is needed
  // later.

  /*jslint nomen: true*/
  child.__super__ = parent.prototype;
  /*jslint nomen: false*/

  return child;
};

var create = function(opts){

  if ( typeof arguments[0] !== 'object' ) {
    opts = {};
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

  var tap = new Tap(opts);

  return tap;

};


module.exports = {
  create: create
};
