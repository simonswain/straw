"use strict";

var _ = require('underscore');

var eventSplitter = /\s+/;

var Node = function(){

  // new Node([opts, done])

  var opts, done;

  if ( arguments.length === 1 ) {
    if (typeof arguments[0] === 'function' ) {
      opts = {};
      done = arguments[0];
    } else {
      opts = arguments[0];
    }

  }

  if ( arguments.length === 2 ) {
    opts = arguments[0];
    done = arguments[1];
  }

  this._counts = {};

  this.opts = opts || {};

};

Node.prototype.initialize = function(opts, done) {
  // if no options provided
  if(typeof opts === 'function'){
    done = opts;
  }
  // initialize requires and must execute callback
  done();
};

Node.prototype.start = function(done) {
  // override this to start automatic processing

  // run requires and must execute callback
  done(false);
};

Node.prototype.stop = function(done) {
  // override this to finish up processing when instructed to stop

  // stop requires and must execute callback
  done(false);
};

Node.prototype.process = function(msg, done) {
  // override this to process an incoming message
  this.output(false, msg);

 // process requires and must execute callback
  done(false);
};

/*
 * output a message from the node
 * output ([outlet,] message [, done])
 */
Node.prototype.output = function() {

  var outlet;
  var message;
  var done;

  outlet = false;
  done = false;

  if ( arguments.length === 1 ) {
    message = arguments[0];
  }

  if ( arguments.length === 2 && typeof arguments[1] === 'function' ) {
    message = arguments[0];
    done = arguments[1];
  } else if ( arguments.length === 2  ) {
    outlet = arguments[0];
    message = arguments[1];
  }

  if ( arguments.length === 3 ) {
    outlet = arguments[0];
    message = arguments[1];
    done = arguments[2];
  }

  this.emit(
    'message',
    {outlet:outlet, message: message}
  );

  if ( ! outlet ) {
    this.count('message');
  } else {
    this.count(outlet);
  }

  if (done) {
    done(false);
  }

};

Node.prototype.count = function(key, value) {

  if ( ! key ) {
    return;
  }

  if ( ! value ) {
    value = 1;
  }

  if ( this._counts[key] === undefined ) {
    this._counts[key] = 0;
  }
  this._counts[key] += value;

  this.emit(
    'count',
    this._counts
  );

};

Node.prototype.counts = function(key) {

  if ( key === undefined ) {
    key = false;
  }

  if ( ! key ) {
    return this._counts;
  }

  if ( this._counts[key] === undefined ) {
    return 0;
  }

  return this._counts[key];

};

Node.prototype.on = function(events, callback, context) {
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

Node.prototype.off = function(events, callback, context) {
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

Node.prototype.emit = function(events) {
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


Node.extend = function(protoProps) {

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

var create = function(def){
  return Node.extend(def);
};

module.exports = {
  create: create
};
