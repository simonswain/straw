# Straw

Realtime processing framework for Node.js

Straw helps you create a Topology of worker Nodes that consume,
process, generate and emit messages, connected together with message
passing Pipes.

Each Node is run in it's own process. Messages are passed in and out
of Nodes as JSON.

A simple Topology might look like this

```
  ping --> count --> print
```

Nodes can have multiple inputs and outputs. Messages can be passed out
to a connected pipe via a node's default output or any number of
arbitrarily named outputs.

Pipes by default fan-out with messages going to the inputs of all
connected nodes, but can be configured to distribute messages
round-robin style.

Redis is used for message passing but Nodes are shielded from
implementation. All you need to write is the processing code. A
callback is available for receiving messages and a method for sending.

There is nothing stopping a node receiving or sending outside the
Topology, e.g. write to a database, fetch or listen for network data.

You can also inject or receive messages by accessing Redis directly so
your topologies can play nicely with existing infrastructure, for
example having an Express server subscribe to one of the channels and
publish it out via socket.io.

StatsD support is included out of the box, giving you visibility of
activity across a topology.

## Installing

    $ npm install straw 

## Hacking

    $ git clone git@github.com:simonswain/straw.git
    $ cd straw
    $ npm install -d

Run the tests (requires `grunt`):

    $ npm test

Run some examples

    $ node examples/ping-count
   
## Usage

By convention you create your Nodes in a folder called `nodes`, and
instantiate a Topology, passing in an object describing how the nodes
are to be piped together.

This example has a Node that generates timestamps once a second, with
it's output going to another that counts the cumulative number of
pings.


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

Nodes extends the prototype Node and override only the methods needed
to do their job.

```javascript
var straw = require('straw');
module.exports = straw.node.extend({
  title: 'Ping',
  timer: null,
  opts: {interval: 1000},
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
    this.output({'ping': new Date().getTime()});
  }
});
```

`process()` is called every time a message receoved at the Node's
input.

Your code needs to call `output()` whenever you have a message to send
out from the node.

```javascript
var straw = require('straw');
module.exports = straw.node.extend({
  title: 'Count',
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    this.output({total: this.total});    
    if ( done ) {
      done(false, {count: this.total});
    }
  }
});
```

Run the topology like this. This example subscribes to a Redis channel
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

Press `^c` to stop.

Calling `console.log` from within a node will output timestamped
messages to the shell, showing you which node they came from.

    $ node examples/ping-count-print


```
2012-11-15 14:59:26 STDOUT   print                {"count":1}
2012-11-15 14:59:27 STDOUT   print                {"count":2}
2012-11-15 14:59:28 STDOUT   print                {"count":3}
```
    
If you make any changes to a node file it's process will be terminated
and respawned. This is really handy in development. try running the
ping-count-print example, edit `examples/nodes/print/index.js` (just
add a space somewhere) then save it. You will see output in the log
letting you know it's been stopped and restarted.

The examples are stored in a folder named after each node, it's fine
making a folder called nodes and naming each node's file directly.
Just make sure you use `__dirname + './path/to/nodes/some-node.js'` in
your Topology definition.

```
nodes/my-node.js
nodes/some-node.js
```
    
## Topology

Each Node must be defined in the Topology like so:

```javascript
'<your-key>':{
    'node': '<absolute-path-to-node>',
    'input':'<redis-channel-in>',
    'output':'<redis-channel-out>',
    'outputs': {
        'named-output':'<some-redis-channel-out>',
        'another-named-output':'<another-redis-channel-out>'
        },
    'log': '<file-to-log-output-to>'
}
```

To specify the location of a node relative to your topology code, use
`__dirname + '../where/is/my/node.js'`.

`input` and `output` can either be the key of a single pipe, or an array of
pipe keys. This lets you aggregate input and branch output.

```javascript
// single
input: 'some-pipe'

// multiple
input: ['this-pipe','that-pipe']
```

`log` and `outputs` are optional. All other fields are required.

`STDOUT` from the node (e.g. `console.log`) will be captured to the log.

You must define named outputs in your Topology before using them in
the node.

Any other fields will be passed in to the Node as options for it to
use as it sees fit.

### Options

You can pass options in to the Topology that will be passed in to all
node runners. These let you set the Redis host and enable StatsD.

```javascript
var straw = require('straw');
var topo = new straw.topology({
  'ping':{
    'node': __dirname + '/nodes/ping',
    'output':'ping-out'
  },
}, {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  statsd: {
    prefix: 'straw',
    host: '127.0.0.1',
    port: 8125
  }
});
```

If no options are provide, or redis is not provided, the default shown
above will be used.

If StatsD is provided, all node inputs and outputs (summed, and split
out by key) will be counted with `node-statsd.increment()`, using the
node's key as the identifier.

If you provide a prefix, it will be prepended to the nodes's key so
you can namespace your stats across multiple Topologies.

## Nodes

These methods can/must be overridden depending on the required
functionality of your node;

```javascript
module.exports = straw.node.extend({
    title: 'Human readable name',
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
    stop: function(done) {
        // stop background processing. will be called when
        terminating.
        done();
    }
});
```

## Pipes

By default the pipes connecting nodes fan-out using Redis PubSub.
Every connected node will receive a copy of a message that is output.

You can configure pipes to be round-robin in your Topology definition
alongside your nodes. Pipes do not have any code to load.

```javascript
  'ping-out': {
    'pipe': 'round-robin',
    'purge': true
  }
```

Nodes receiving input from this pipe will receive messages in turn,
with only one connected node receiving each message.

If set the `purge` option ensures the pipe is cleared when the
Topology is started so un-processed messages from previous runs are
not consumed.

Round-robin pipes are implemented using redis lists and blocking pops.

### Stats

Nodes accumulate counts of messages emitted. You can use the count
method to count arbitrary values also.

```javascript
this.count('some-key');
this.count('some-key', howmany);

this.counts(); // {"messages": 5, "some-key":4}
this.counts("some-key"); // 4
```

## Installing as a service

Once you have your Topology tested and working you'll probably want to
install it as a service.

Place this somewhere like `/etc/init/myapp.conf`. The path to your
node binary may be different, particularly if you are using nvm.

```
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

## Todo

* create and change topologies dynamically
* run workers on remote hosts
* expose counts via Topology

## Thanks

Straw takes some inspiration from
[Storm](https://github.com/nathanmarz/storm) and
[Max/MSP](http://cycling74.com). It uses some code and concepts from
[Backbone](http://backbonejs.org) for the node definitions and event
handling.

## Release History

* 14/11/2012 0.1.0 Initial release
* 15/11/2012 0.1.1 StatsD support 
* 22/11/2012 0.1.2 Round-robin pipes

## License
Copyright (c) 2012 Simon Swain  
Licensed under the MIT license.
