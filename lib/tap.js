"use strict";

var redis = require('redis');
var _ = require('underscore')._;

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

  this.clients = {
    input: redis.createClient(opts.redis.port, opts.redis.host),
    output: redis.createClient(opts.redis.port, opts.redis.host)
  };

  if ( opts.input === undefined ) {
    opts.input = [];
  }

  if ( opts.inputs === undefined ) {
    opts.inputs = [];
  }

  if ( opts.output === undefined ) {
    opts.output = [];
  } else if (typeof opts.output !== 'undefined' ) {
    if ( ! Array.isArray(opts.output)) {
      opts.output = [opts.output];
    }
  }

  if ( opts.outputs === undefined ) {
    opts.outputs = {};
  }


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

  this.brpop = function() {
    var self = this;
    self.clients.input.brpop(self.lkeys, function(err, reply){      
      if (!reply){        
        // brpop timed out
        self.brpop();
        return;          
      }
      var message = false;
      if(!err){
        try {
          message = JSON.parse(reply[1]);
        } catch (e) {
          // bad json
          self.brpop();
          return;          
        }
        self.emit('message', message);
        self.brpop();
      }
    });
  };

  // set up pipes then run the node

  // if only one input, arrayize it. if multiple inputs are provided,
  // they will already be in an array
  if (!Array.isArray(opts.input)) {
    opts.input = [opts.input];
  }

  this.lkeys = [];
  opts.input.forEach(function(x){
    self.lkeys.push(opts.redis.prefix + ':' + x);
  });

  // last element is polling timeout
  if (this.lkeys.length > 0) {    
    this.lkeys.push(1);
    // start pulling data from the pipes
    this.brpop();
  }

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

module.exports = Tap;
