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
    done(false);
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
