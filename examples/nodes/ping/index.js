var straw = require('../../../lib/straw.js')

/*
 * emits ping every interval ms
 */

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
