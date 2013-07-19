var straw = require('../../../lib/straw.js')

module.exports = straw.node.extend({
  title: 'Stats',
  timer: null,
  opts: {interval: 1000},
  stats: {},  
  initialize: function(opts, done){
    this.opts.interval = opts && opts.interval || 1000;
    process.nextTick(done);
  },
  run: function() {
    this.timer = setInterval(this.print.bind(this), this.opts.interval);
    this.redis.client
      .on('pmessage', this.collect.bind(this))
      .psubscribe(this.redis.prefix + ':stats:*');
  },
  collect: function(pattern, channel, data){
    var data = JSON.parse(data);
    this.stats[channel] = data.message;
    //console.log(channel, data.message);
  },  
  stop: function(done) {
    clearInterval(this.timer);
    this.redis.client.punsubscribe(this.redis.prefix + ':stats:*');
    client.quit();
    done();
  },
  print: function() {
    console.log( JSON.stringify(this.stats));
  }
});
