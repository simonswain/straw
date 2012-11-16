var Runner = require('./runner.js');

var Topology = function (topo) {

  var done, opts;

  if ( typeof arguments[2] === 'function' ) {
    done = arguments[2];
  } else if ( typeof arguments[1] === 'function' ) {
    done = arguments[1];
  }

  if ( typeof arguments[1] === 'object' ) {
    opts = arguments[1];
  }

  this.__nodes = {};
  this.create(topo, opts, function(err, res){
    if ( done ) {
      done(false, false);
    }
  });

};

Topology.prototype.create = function(topo, opts, done) {

  var key;
  var count = 0;

  for ( key in topo ) {
    count = count + 1;
  }

  var finished = function(err, res) {
    count = count - 1;
    if ( count === 0 ) {
      if ( done ) {
        done(false, null);
      }
    }
  };

  for ( key in topo ) {
    this.spawn(key, topo[key], opts, finished);
  }

};

// create new node runner
Topology.prototype.spawn = function(key, def, opts, done) {

  def.key = key;
  this.__nodes[key] = def;

  opts = opts || {};

  def.runner = new Runner (
    def,
    opts,
    function(err, res) {
      //console.log('SPAWNED', key, JSON.stringify(def));
      if ( done ) {
        done(false, null);
      }
    });

};

module.exports = Topology;
