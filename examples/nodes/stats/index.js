var straw = require('../../../lib/straw.js')
var redis = require('redis'), client = redis.createClient();

module.exports = straw.node.extend({
  title: 'Stats',
  timer: null,
  opts: {interval: 1000},
  stats: {},  
  initialize: function(opts){
    this.opts.interval = opts && opts.interval || 1000;
  },
  run: function() {
    this.timer = setInterval(this.print.bind(this), this.opts.interval);
    client
      .on('pmessage', this.collect.bind(this))
      .psubscribe('stats:*');
  },
  collect: function(pattern, channel, data){
    var data = JSON.parse(data);
    this.stats[channel] = data.message;
    //console.log(channel, data.message);
  },  
  stop: function(done) {
    clearInterval(this.timer);
    client.punsubscribe('stats:*');
    client.quit();
    done();
  },
  print: function() {
    console.log( JSON.stringify(this.stats));
  }
});
