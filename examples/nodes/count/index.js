var straw = require('../../../lib/straw.js')

/*
 * emits cumulative count of messages received.
 */

module.exports = straw.node.extend({
  title: 'Count',
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    this.output( false, {count: this.total});    
    if ( done ) {
      done(false, {count: this.total});
    }
  }
});
