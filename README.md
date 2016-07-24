# Straw

Realtime processing framework for Node.js

Version 0.4.0

[![Build Status](https://travis-ci.org/simonswain/straw.png)](https://travis-ci.org/simonswain/straw)

Straw lets you run a Topology of worker Nodes that consume, process,
generate and emit messages.

## Use Cases

Use it anywhere you need data processed in real-time.

Straw is ideal for building flux style reactive webapps.

You create processing nodes that pass messages to each other or the
outside world.

Straw's approach makes it easy to break your problem down in to small
steps and develop iteratively.

Each step in the flow is a separate unix process that Straw manages
for you, automatically making use of multiple cores, and simplifying
spreading the load across multiple machines.

[ASX Energy](https://asxenergy.com.au) uses Straw to consume live
market data via a FIX feed from the exchange, deal with each different
type of message from the market, route them to historical storage,
implement a delayed feed from the live one, and stream messages to web
clients in real-time over socket.io.

[Haystack](https://github.com/simonswain/haystack) provides an example
of how you might do something similar.

## Resources

* [Straw talk at JSconf.asia 2013](https://www.youtube.com/watch?v=Q0iBoqhUVck)
* [Haystack - Twitter firehose consumer](https://github.com/simonswain/haystack) Straw demo app

## Mailing List

[Straw JS Google Group](https://groups.google.com/d/forum/strawjs)

## Introduction

Using Straw you connect together a set of worker Nodes.

Each Node is run in it's own process. Messages are passed in and out
of Nodes as JSON.

A simple Topology might look like this

```
  ping --> count --> print
```

Nodes can have multiple inputs and outputs. Messages can be passed out
default output or any number of arbitrarily named outputs.

Messages are queued between Nodes, with each Node processing one
message at a time.

Redis is used for message passing but Nodes are shielded from
implementation. All you need to write is the processing code, extend a
handler for receiving messages and call a method to output a message.

There is nothing preventing a node receiving or sending outside the
Topology, e.g. write to a database, fetch or listen for network data.

A library method is provided to inject or receive messages from
outside the Topology so you can play nicely with existing
infrastructure, for example having data pipe in to an Express server
for publishing out via socket.io.

## Installing

To use Straw in your Node.JS app:

    $ npm install straw

## Hacking

To play with or work on Straw:

    $ git clone git@github.com:simonswain/straw.git
    $ cd straw
    $ npm install

Run the tests (`npm install -g grunt-cli` first):

    $ npm test

Run some examples:

    $ node examples/ping-count-print.js

## Usage

By convention you create your Nodes in a folder called `nodes`, make a
new empty Topology, add nodes to it, then tell it to start processing.

This example has a Node that generates timestamps once a second, with
it's output going to another that counts the number of pings.

The inputs and outputs connect the nodes together.

```javascript
var straw = require('straw');
var topo = straw.create();

topo.add([{
  id: 'ping',
  node: 'ping',
  output:'ping-out'
}, {
  id: 'count',
  node: 'count',
  input: 'ping-out',
  output:'count-out'
},{
  id: 'print',
  node: 'print',
  input: 'count-out'
}], function(){
  topo.start();
});
```

To create a Node, you export a module that overrides Straw's stub
methods as required.

All nodes have `initialize`, `start`, `stop` and `process` methods,
which must execute a callback when done. Replace any of these, and add
your own private methods if required.

Ping is an example of a node that only generates output. Nodes can
either consume input, produce output, or both.

```javascript
var straw = require('straw')
module.exports = straw.node({
  timer: null,
  opts: {interval: 1000},
  initialize: function(opts, done){
    this.opts.interval = opts && opts.interval || 1000;
    done();
  },
  start: function(done) {
    this.timer = setInterval(this.ping.bind(this), this.opts.interval);
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

`#process()` is called every time a message received at the Node's
input. It's your handler for inbound messages. For any interesting
work you will most probably have to do something here.

Your code needs to call `#output()` whenever you have a message to send
out from the node, and must excute the `done` callback when finished.

Nodes process messages sequentially. `done` lets Straw know you're
ready for the next message.

Here, the done callback is being passed to `#output` and will be
executed once the message has been successfully sent out of the node.

```javascript
var straw = require('straw');
module.exports = straw.node({
  total: 0,
  process: function(msg, done) {
    this.total ++;
    this.output({count: this.total}, done);
  }
});
```

Calling `console.log` from within a node will output timestamped
messages to Straw's loggeer showing you which Node they came from.

Run the topology like this:

```
$ node examples/ping-count-print.js
info: 2014-05-14 16:25:38 ADD      ping
info: 2014-05-14 16:25:39 INIT     ping 15435
info: 2014-05-14 16:25:39 ADD      count
info: 2014-05-14 16:25:39 MESSAGE  ping                 INITIALIZED
info: 2014-05-14 16:25:39 INIT     count 15437
info: 2014-05-14 16:25:39 ADD      print
info: 2014-05-14 16:25:39 MESSAGE  count                INITIALIZED
info: 2014-05-14 16:25:39 INIT     print 15439
info: 2014-05-14 16:25:39 MESSAGE  print                INITIALIZED
info: 2014-05-14 16:25:39 PIPE     ping-out 0
info: 2014-05-14 16:25:39 PIPE     count-out 0
info: 2014-05-14 16:25:39 TOPOLOGY PURGED
info: 2014-05-14 16:25:39 MESSAGE  ping                 STARTING
info: 2014-05-14 16:25:39 STARTED  ping
info: 2014-05-14 16:25:39 MESSAGE  ping                 STARTED
info: 2014-05-14 16:25:39 MESSAGE  print                STARTING
info: 2014-05-14 16:25:39 STARTED  print
info: 2014-05-14 16:25:39 MESSAGE  print                STARTED
info: 2014-05-14 16:25:39 MESSAGE  count                STARTING
info: 2014-05-14 16:25:39 STARTED  count
info: 2014-05-14 16:25:39 TOPOLOGY STARTED
info: 2014-05-14 16:25:39 MESSAGE  count                STARTED
info: 2014-05-14 16:25:40 STDOUT   print                {"count":1}
info: 2014-05-14 16:25:41 STDOUT   print                {"count":2}
info: 2014-05-14 16:25:42 STDOUT   print                {"count":3}
```

Press `^C` to stop.

### Live reload

If you make any changes to a node file it's process will be
terminated, re-initialized, and if it was running, restarted. This is
really handy in development. Try running the ping-count-print example,
edit `examples/nodes/print/index.js` (just add a space somewhere) then
save it. You will see output in the log letting you know it's been
stopped and restarted.

## Topology

A Topology is a collection of Nodes. In Straw, you create a
Topology, add nodes to it, indicating named pipes that connect the
nodes together.

Once you've made a Topology you can start or stop it processing, get
runtime stats from it and destroy it when done.

```javascript
var straw = require('straw');
var topo = straw.create();
```

You can pass options in to your topology if you need to tell it where
Redis is, or to define a `nodes_dir`.

Logging can be silenced via the `logging` option. By default it's enabled.

```javascript
var opts = {
  nodes_dir: __dirname + '/nodes',
  redis: {
    host: '127.0.0.1',
    port: 6379,
    prefix: 'straw-example'
  },
  logging: {silent: true}
};

var topo = straw.create(opts);
```

`redis.prefix` will be prepended to all Redis keys used by that
Topology. This is useful for partitioning Topologies on the same
server. It is also passed in to the nodes so they can use it.

### Topology Methods

`#add(node)` adds a node.

`#start()` will start your topology processing. Passive nodes (that
just receive inputs) will start checking their inbound pipes for
messages. The `#start` method on each node will be called to initiate
any active processing.

`#stop()` will call the `#stop()` method on all nodes, and stop
messages being consumed once the current message on each node is
finished.

`#purge` clears all queued messages from the topology's pipes.

`#stats(callback(err,data){})` will provide real-time stats on the
nodes and pipes in the topology. For nodes, the in and out message
counts are given. For pipes, the number of messages currently queued.
See `examples/stats`.

`#inspect()` returns the current structure of the topology.

`#destroy(callback)` stops the topology and destroys all it's nodes.


## Nodes

You add Nodes to your Topology like so:

```javascript
topo.add({
    'id: '<unique-name-for-node>',
    'node': '<file node is in>',
    'input':'in-pipe-name',
    'output':'out-pipe-name',
    'outputs': {
        'name': 'pipe',
        'another: ['another-pipe-1', 'another-pipe-2']
        }
}, callback);
```
You can add multiple nodes by providing an array of objects instead of
a single object.

To specify the location of a node relative to your topology code, use
`__dirname + '/where/is/my/node.js'`.

Normally you will want to store your node files in a folder called
'`nodes'` in the same location as the code that is using them

It's fine making a folder called nodes and referencing each node's
file directly. Be sure to use an absolute path, e.g. `__dirname +
'./path/to/nodes/some-node.js'` in your Topology definition, as nodes
are run in their own process and will have no concept of the directory
your topology exists in.

As a convenience, if you pass in options to your Topolology containing
`nodes_dir`: __dirname + '/path/to/nodes'` you can identify your Nodes
by their filename (without an extension) and Straw will take care of
finding the files for you. The demos in the examples folder do it this
way.

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

You can provide multiple named outputs from a node. This lets you call
`#output(<name>, message, callback)` to send a message to a specific
output. Use this when you need to do routing based on the message
content.

Named outputs are specified as key-value pairs. The key is the name of
the output. The value can be a string (single pipe) or array (multiple
destinations for the same output).

```javascript
// named outputs
outputs: {
   'futures':'futures', 
   'options':['options-1','options-2']
 }
```

`input`, `output` and `outputs` are optional. If your node doesn't
need input or output then you don't need them.

`STDOUT` from the node (e.g. `console.log`) will be captured to the
Topology and logged.

Any other fields you add will be passed in to the Node as options for
it to use as it sees fit.

The callback will be executed once all the nodes you provided have
been added and initialized. From there, the topology is ready to
start.

`topology#start` will tell all the nodes to start processing - they
will begin to pull methods off their pipes and process them. The
`start` method on any Nodes that have one will be called.

`topology#stop` will let nodes finish processing their current
message, and call the `stop` method on any Nodes that have one.

Use the `start` and `stop` methods to create nodes that do processing
without relying on incoming messages (e.g connecting to a remote
service and getting data)

`topology#destroy` will stop all the nodes and quit the Topology.

`topology#purge` will flush any unprocessed messages in the pipes.


## Nodes

These methods can/must be overridden depending on the required
functionality of your node;

The `done` callbacks are required.

In the `#initialize` method, you must call `done()` when you're
finished.

```javascript
var straw = require('straw');

var Node = straw.node({
  initialize: function(opts, done) {
    // process incoming options from the topology definition, set up
    // anything you need (e.g. database connection, initial data) and
    // when all finished run the done callback.
    done();
  },
  process: function(msg, done) {
    // process an incoming message. msg will be JSON.
    // this example just passes the message through. normally you
    // would do some work on it here.
    // ...
    // and send it via the default output
    this.output(msg, done);
  },
  start: function(done) {
    // start some background processing here e.g. fetch or
    // generate data, set an interval timer.
    done();
  },
  stop: function(done) {
    // stop background processing. will be called when
    // pausing processing or terminating node.
    done();
  }
});
```

## Pipes

Pipes are implemented using Redis lists - `lpush` and `brpop`.

When more than one Node is connected to a given output, only one will
receive each message. This lets you easily load-balance output from a
node by connecting more than one downstream node to it's output.

When a node finishes processing a message it must call the `done`
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
  input: 'from-topology-pipe,
  output: 'to-topology-pipe,
  redis: { ... optional redis config ... }
});

tap.output(msg);

tap..on('message', function() {
  // ...
});

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
[Backbone](http://backbonejs.org) for the node definitions and event handling.

## Release History

* 14/11/2012 0.1.0 Initial release
* 15/11/2012 0.1.1 StatsD support
* 22/11/2012 0.1.2 Round-robin pipes
* 23/01/2013 0.1.3 Taps
* 31/01/2013 0.1.5 Cleaning up callback usage
* 08/04/2013 0.1.6 Added pidsfile support
* 19/07/2013 0.2.0 Removed Pubsub. Enforced callbacks.
* 28/10/2013 0.2.2 Bugfixes
* 23/06/2014 0.2.5 Redis remote host fix
* 25/06/2014 0.3.0 Version 3
* 14/11/2014 0.3.1 Remove Hiredis, added bind on stop (thanks @a-s-o)
* 10/03/2015 0.3.2 Update packages
* 24/07/2016 0.4.0 Update node and deps

## License

Copyright (c) 2012-2016 Simon Swain

Licensed under the MIT license.

![Analytics](https://ga-beacon.appspot.com/UA-43779164-2/simonswain/straw?pixel)
