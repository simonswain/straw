"use strict";

var redis = require('redis');
var _ = require('underscore')._;

var eventSplitter = /\s+/;

var Tap = function(opts) {

  var self = this;

  this.opts = opts;


  var clients = this.clients = {
    sub: redis.createClient(opts.redis),
    pop: redis.createClient(opts.redis),
    out: redis.createClient(opts.redis)
  };

  this.opts = opts || {};

  this._counts = {};

  if (typeof opts.redis === 'undefined') {
    opts.redis = {
      host: '127.0.0.1',
      port: 6379
    };
  }

  // pipes will push to this redis channel. process must execute the
  // callback to signal it's ready to process another message

  // convert to array if not. this is how we subscribe to multiple
  // pipes

  if ( opts.input !== undefined ) {

    if ( ! Array.isArray(opts.input)) {
      opts.input = [opts.input];
    }

    clients.sub.on('message', function(channel, msg){
      msg = JSON.parse(msg);
      self.emit('message', msg);
    });

  
    // subscribe to fan-out pipes (redis pubsub)

    this.lkeys = [];
    opts.input.forEach(function(x){
      clients.sub.subscribe(x);
    });

  }


  this.send = function() {    

    var outlet = false;
    var msg;
    var done = false;
    // output a message, optionally on a named outlet
    //
    // output ([outlet,] message [, done])

    if ( arguments.length === 1 ) {
      msg = arguments[0];
    }

    if ( arguments.length === 2 ) {
      // msg, done
      if ( typeof arguments[1] === 'function' ){
        msg = arguments[0];
        done = arguments[1];
      } else {
        outlet = arguments[0];
        msg = arguments[1];
      }
    }

    if ( arguments.length === 3 ) {
      outlet = arguments[0];
      msg = arguments[1];
      done = arguments[2];
    }

    clients.out.publish(
      self.opts.output,
      JSON.stringify(msg),
      function(err) {
        if (err) {
          console.log(err);
        }          
      });

    if (!!done) {
      done(false);
    }


  };

};

Tap.prototype.destroy = function(done) {
  var self = this;
  this.clients.out.quit();
  this.clients.sub.quit();
  this.clients.pop.quit();
  if ( done ) {    
    done(false, null);
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
