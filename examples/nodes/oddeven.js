var straw = require('../../lib/straw.js')

/*
 * emits cumulative count of messages received.
 */

module.exports = straw.node({
  total: 0,
  field: 'value',
  initialize: function(opts, done) {
    if ( typeof this.opts.field !== 'undefined' ) {
      this.field = this.opts.field;
    }
    done();
  },
  process: function(msg, done) {      
    var r;
    
    r = ( msg[this.field] % 2 === 0 ) ? 'even' : 'odd';

    this.output(r, {value: msg[this.field]});    
    this.output(false, msg);

    if (done) {
      done(null, {value: msg[this.field], result: r});
    }
  }
});
