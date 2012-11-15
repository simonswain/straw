# Straw

Stream processing infrastructure for Node.js

Used to simplify realtime processing in node.

You create a topology simple worker nodes that can consume, process,
generate and emit messages.

Messages are passed between worker nodes as JSON.

Redis pubsub is used for message passing, but the worker nodes are
shielded from this.

Each worker node is run in it's own process. There is nothing stopping
a node receiving or sending outside the topology, e.g. using the
network to source data, or writing to a database.

You can also inject or receive messages by accessing Redis pubsub
directly. This lets your topologies play nicely with existing
infrastructure.

## Getting Started
Install the module with: `npm install straw`

```javascript
var straw = require('straw');
straw.awesome(); // "awesome"
```

## Installation

   $ npm install straw
   $ cd straw
   $ npm install -d
   # cp config/config.sample.js config/config.js

Run the tests (require `grunt`):

   $ npm test

## Run some examples

   $ node examples/ping-count
   
## Usage

By convention you create your workers nodes in a folder called `nodes`

Then create the topology by passing in an object describing how it is
wired up.

This example has a node that pings, with it's output going to another
that counts the cumulative number of pings.

`examples/ping-count.js`

```javascript
var straw = require('straw');
var topo = new straw.topology({
  'ping':{
    'node': __dirname + '/nodes/ping',
    'output':'ping-out'
  },
  'count':{
    'node': __dirname + '/nodes/count',
    'input':'passthru-out',
    'output':'count-out'
  }
});
```

Worker nodes extends the prototype worker node and override methods as
required.

`nodes/ping.js`

```javascript
var straw = require('straw');
module.exports = straw.node.extend({
  title: 'Ping',
  timer: null,
  ops: {interval: 1000},
  initialize: function(opts, done){
    this.opts.interval = opts && opts.interval || 1000;
  },
  run: function() {
    var self = this;
    var fn = function() {
      self.ping();
    };
    this.timer = setInterval(fn, this.opts.interval);
  },
  stop: function(done) {
    clearInterval(this.timer);
    if ( done ) {
      done(false, null);
    }
  },
  ping: function() {
    this.output(false, {'ping': new Date().getTime()});
  }
});
```

`nodes/count.js`. #process is called every time a
message is passed in to a node.

```javascript
var straw = require('straw');
module.exports = straw.node.extend({
  title: 'Count',
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    this.output( false, {total: this.total});    
    if ( done ) {
      done(false, {count: this.total});
    }
  }
});
```

Run the topology like this. This example subscribes to a redis channel
to show you the outputs from the counter

    $ node examples/ping-count

Output:

```
2012-11-15 12:07:04 STARTING ping
2012-11-15 12:07:04 STARTING count
2012-11-15 12:07:04 STARTED  ping
2012-11-15 12:07:04 STARTED  count
{ count: 1 }
{ count: 2 }
{ count: 3 }
```

Press ^C to stop.

Calling `console.log` from within a node will output timestamped
messages, showing you which node they came from.

    $ node examples/ping-count-print

If you make any changes to a node file, it's will be terminated and
respawned. This is really handy in development. try running the
ping-count-print example, edit `examples/nodes/print/index.js` (just
add and delete a space) then save it. It will be killed andrestarted.

    
## Topology

Each worker node must be defined in the topology as such:

```javascript
'<your-key>':{
    'node': '<absolute-path-to-node>',
    'input':'<redis-channel-in>',
    'output':'<default-redis-channel-out>',
    'outputs': {
        'named-output':'<redis-channel-out>',
        'another-named-output':'<another-redis-channel-out>'
        },
    'log': '<file-to-log-output-to>'
}
```

`log` and `outputs` are optional. All other fields are required.

Any STD* output will be captuers to the log.

You must define named outputs before using them.

Any other fields will be passed in to the worker node as options for
it to use as it sees fit.

## Node

These methods can/must be overridden depending on the required
functionality of your node;

```javascript
module.exports = straw.node.extend({
    title: 'Haman readable name',
    initialize: function(opts) {
        // process incoming options (from the topology definition
        // and set up anything you need (e.g. database connection).
    },
    process: function(msg, done) {
        // process an incoming message. msg will be JSON.

        // this example just passes thru msg. normally you would do
        // some work on it here.
        // ...
        // and send it via the default output

        this.output(msg);

        // or send it via a named output. The name must be configured
        // in your topology
        this.output('named-output', msg);
    },
    run: function() {
        // start some background processing here e.g. fetch or
        // generate data
    },
    stop: function() {
        // stop background processing. will be called when terminating.
    }
});
```

### Stats

Nodes accumulate counts of messages emitted. You can use the count
method to count arbitrary values also.

       this.count();
       this.count('some-key');
       this.count('some-key', howmany);

       this.counts(); // {"messages": 5, "some-key":4}
       this.counts("some-key"); //

## Installing as a service

Once you have your topology tested and working, you'll probably want
to install it as a service.

Place this something like `/etc/init/myapp.conf`. The path to your
node binary may be different, articularly if you are using nvm.

```bash
#!upstart
description "My Topology"
author      "simon"

start on startup
stop on shutdown

script
    export HOME="/path/to/app"
    echo $$ > /var/run/my-app.pid
    exec sudo -u sysop /usr/bin/node /path/to/app/myapp.js >> /var/log/app/myapp.log 2>&1
end script
```

        $ sudo service myapp start

## Real world usage

This early version of Straw is in production

- Electricity futures market data
- Remote sensor device

## Issues

* no guaranteed delivery of messages
* no round-robin style processing across multiple instances of the same node

## Nice to have

* pipes between nodes abstracted out
* create and change topologies dynamically
* use lists and blocking gets instead of pubsub
* run workers on remote hosts

## Thanks

Straw takes some inspiration from
[Storm](https://github.com/nathanmarz/storm) and
[Max/MSP]{http://cycling74.com). It uses some code and concepts from
(Backbone)[http://backbonejs.org] for the node definitions and event
handling.

## Release History

15/11/2012 Initial release

## License
Copyright (c) 2012 Simon Swain  
Licensed under the MIT license.
