var straw = require('../../../lib/straw.js')

/*
 * simulate working on a long running job.
 */

module.exports = straw.node.extend({
  title: 'Heavy Lifting',
  total: 0,
  process: function(msg, done) {      
    this.total ++;
    var self = this;
    var complete = function() {
      self.output({key: self.opts.key, count: self.total});    
      if ( done ) {
        done(false, {count: self.total});
      }
    }
    setTimeout(complete, 2000);
  }
});
