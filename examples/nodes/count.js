var straw = require('../../lib/straw.js')

/*
 * emits cumulative count of messages received.
 */

module.exports = straw.node({
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    this.output({count: this.total}, done);
  }
});
