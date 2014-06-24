var straw = require('../../lib/straw.js')

module.exports = straw.node({
  timer: null,
  opts: {interval: 1000},
  initialize: function(opts, done){
    this.opts.interval = opts && opts.interval || 1000;
    done();
  },
  start: function(done) {
    this.timer = setInterval(this.ping.bind(this), this.opts.interval);
    done();
  },
  stop: function(done) {
    clearInterval(this.timer);
    done(false);
  },
  ping: function() {
    this.output({
      'ping': new Date().getTime()
    });
  }
});
