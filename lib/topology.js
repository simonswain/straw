var Runner = require('./runner.js');

var Topology = function (topo, done) {
  this.__nodes = {};
  this.create(topo, function(err, res){
    if ( done ) {
      done(false, false);
    }
  });
};

Topology.prototype.create = function(topo, done) {

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
    this.spawn(key, topo[key], finished);
  }

};

// create new node runner
Topology.prototype.spawn = function(key, def, done) {
  
  def.key = key;
  this.__nodes[key] = def;
  
  def.runner = new Runner (
    def, 
    function(err, res) {
      //console.log('SPAWNED', key, JSON.stringify(def));
      if ( done ) {
        done(false, null);
      }
    });    

};

module.exports = Topology;
