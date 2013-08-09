# Straw

Realtime processing framework for Node.js

Version 0.2.0

[![Build Status](https://travis-ci.org/simonswain/straw.png)](https://travis-ci.org/simonswain/straw)

Straw lets you run a Topology of worker Nodes that consume, process,
generate and emit messages, connected together with message passing
Pipes.

Each Node is run in it's own process. Messages are passed in and out
of Nodes as JSON.

A simple Topology might look like this

```
  ping --> count --> print
```

Nodes can have multiple inputs and outputs. Messages can be passed out
to a connected pipe via a Node's default output or any number of
arbitrarily named outputs.

Messages are queued between Nodes, with each Node processing one
message at a time.

Redis is used for message passing but Nodes are shielded from
implementation. All you need to write is the processing code, extend a
handler for receiving messages and call a method to send.

There is nothing preventing a node receiving or sending outside the
Topology, e.g. write to a database, fetch or listen for network data.

A library method is provided to inject or receive messages from
outside the Topology so you can play nicely with existing
infrastructure, for example having data pipe in to an Express server
for publishing out via socket.io.

StatsD support is included out of the box, giving you visibility of
activity across a topology.

## Installing

    $ npm install straw 

## Hacking

    $ git clone git@github.com:simonswain/straw.git
    $ cd straw
    $ npm install -d

Run the tests (`npm install -g grunt-cli` first):

    $ npm test

Run some examples

    $ node examples/ping-count-print.js
   
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
    'node': __dirname + '/../examples/nodes/ping',
    'output':'ping-out'
  },
  'count':{
    'node': __dirname + '/../examples/nodes/count',
    'input':'ping-out',
    'output':'count-out'
  },
  'print':{
    'node': __dirname + '/../examples/nodes/print',
    'input':'count-out'
  }
});
```

Nodes extends the prototype Node and override only the methods needed
to do their job.

```javascript
var straw = require('straw')
module.exports = straw.node.extend({
  title: 'Ping',
  timer: null,
  opts: {interval: 1000},
  initialize: function(opts, done){
    this.opts.interval = opts && opts.interval || 1000;
    done();
  },
  run: function(done) {
    var self = this;
    var fn = function() {
      self.ping();
    };
    this.timer = setInterval(fn, this.opts.interval);
    done(false);
  },
  stop: function(done) {
    clearInterval(this.timer);
    done(false);
  },
  ping: function() {
    this.output({'ping': new Date().getTime()});
  }
});
```

`process()` is called every time a message received at the Node's
input.

Your code needs to call `output()` whenever you have a message to send
out from the node, and must excute the `done` callback.

```javascript
var straw = require('straw');
module.exports = straw.node.extend({
  title: 'Count',
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    this.output({count: this.total}, done);
  }
});
```

Calling `console.log` from within a node will output timestamped
messages to the shell, showing you which Node they came from.

Run the topology like this:


```
$ node examples/ping-count-print.js 
2013-07-20 10:59:17 INIT     6988 print
2013-07-20 10:59:17 STARTED  6988 print
2013-07-20 10:59:17 INIT     6985 ping
2013-07-20 10:59:17 STARTED  6985 ping
2013-07-20 10:59:17 INIT     6987 count
2013-07-20 10:59:17 STARTED  6987 count
2013-07-20 10:59:17 TOPOLOGY STARTED
2013-07-20 10:59:18 STDOUT   print                {"count":1}
2013-07-20 10:59:19 STDOUT   print                {"count":2}
2013-07-20 10:59:20 STDOUT   print                {"count":3}
```

Press `^C` to stop.

    
(Watching files is disabled for now until I can resolve `Error watch
EMFILE` being thrown. You can re-enable by changing `this.watch =
false;` to true at the top of lib/runner.js)

If you make any changes to a node file it's process will be terminated
and respawned. This is really handy in development. try running the
ping-count-print example, edit `examples/nodes/print/index.js` (just
add a space somewhere) then save it. You will see output in the log
letting you know it's been stopped and restarted.

The examples are stored in a folder named after each node, it's fine
making a folder called nodes and naming each node's file directly.
Just make sure you use an absolute path, e.g. `__dirname +
'./path/to/nodes/some-node.js'` in your Topology definition.

```
nodes/my-node.js
nodes/some-node.js
```
    
## Topology

Each Node must be defined in the Topology like so:

```javascript
'<your-key>':{
    'node': '<absolute-path-to-node>',
    'input':'in-pipe-name',
    'output':'out-pipe-name',
    'outputs': {
        ['named-output', 'another-named-output']
        },
    'log': '<file-to-log-output-to>'
}
```

To specify the location of a node relative to your topology code, use
`__dirname + '/where/is/my/node.js'`.

`input` and `output` can either be the key of a single pipe, or an
array of pipe keys. This lets you aggregate input and branch output.
If the output field is an array, the same message will be sent to each
of them.

```javascript
// single
input: 'some-pipe'
output: 'that-pipe'

// multiple
input: ['this-pipe','that-pipe']
output: ['this-pipe','that-pipe']
```

`log` and `outputs` are optional. All other fields are required.

`STDOUT` from the node (e.g. `console.log`) will be captured to the log.

You must define named outputs in your Topology before using them in
the node.

Any other fields will be passed in to the Node as options for it to
use as it sees fit.

You can optionally place a callback function as the last argument to
`straw.topology` that will be called once all the Nodes are up and
running.

topology#destroy will take down all the nodes and pipes used in the
Topology.

### Options

You can pass options in to the Topology that will be passed in to all
node runners. These let you set the Redis host and enable StatsD. You
can add your own keys to `redis`, which is handy for things like
adding prefixes to your keys in to the Node.

```javascript
var straw = require('straw');
var topo = new straw.topology({
  'ping':{
    'node': __dirname + '/nodes/ping',
    'output':'ping-out'
  },
}, {
  pidsfile: __dirname + '/../straw-pids.js',
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

If no options or redis are provided, the default shown above will be
used.

If pidsfile is provided, when Straw starts a Topology it will write the
PIDs of the nodes to this file, and on next start will attempt to kill
those PIDs. This experimental feature is to try and kill Nodes left
still running after a crash.

If StatsD is provided, all node inputs and outputs (summed, and split
out by key) will be counted with `node-statsd.increment()`, using the
node's key as the identifier.

If you provide a prefix, it will be prepended to the nodes's key so
you can namespace your stats across multiple Topologies.

## Nodes

These methods can/must be overridden depending on the required
functionality of your node;

The `done` callbacks are required.

In the `#initialize` method, you must call `done()` when you're
finished.

```javascript
module.exports = straw.node.extend({
    title: 'Human readable name',
    initialize: function(opts, done) {
        // process incoming options from the topology definition,
        // set up anything you need (e.g. database connection)
        // and when all finished run the done callback.
        done();
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
        done();
    },
    run: function(done) {
        // start some background processing here e.g. fetch or
        // generate data
        done();
    },
    stop: function(done) {
        // stop background processing. will be called when
        // terminating.
        done();
    }
});
```

## Pipes

Pipes are implemented using Redis lists - `lpush` and `brpop`. 

When more than one Node is connected to a given output, only one will
receive each message. This lets you easily load-balance output from a
node.

When a node finished processing a message it must call the `done`
callback. This signals it's ready for the next message.

If you want a message to go to several nodes, create multiple outputs
and connect one node to each.

`examples/busy-worker.js` and `examples/busy-workers.js` show this in
operation.

If no purge flag is set or if set to true, pipes are cleared when the
Topology is started so un-processed messages from previous runs are
not consumed. To retain them across restarts set purge to false.

### Tap In/Out

You can connect to a Topology from existing code. These Tap methods
behave the same as those you would write inside your nodes.

```javascript
var tap = new straw.tap({
  'input':'from-topology-pipe,
  'output':'to-topology-pipe
});

tap.send(msg);

tap..on('message', function() {
  // ...
});

```

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
* 23/01/2013 0.1.3 Taps
* 31/01/2013 0.1.5 Cleaning up callback usage
* 08/04/2013 0.1.6 Added pidsfile support
* 19/07/2013 0.2.0 Removed Pubsub. Enforced callbacks.

## License
Copyright (c) 2012-2013 Simon Swain  
Licensed under the MIT license.
