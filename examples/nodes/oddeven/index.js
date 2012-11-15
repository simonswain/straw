var straw = require('../../../lib/straw.js')

/*
 * emits cumulative count of messages received.
 */

module.exports = straw.node.extend({
  title: 'OddEven',
  total: 0,
  process: function(msg, done) {      
    var r;

    r = ( msg.value % 2 === 0 ) ? 'even' : 'odd';

    this.output(r, {value: msg.value});    
    this.output(false, msg);

    if ( done ) {
      done(false, {value: msg.value, result: r});
    }
  }
});
