var straw = require('../../lib/straw.js')

/*
 * receive input but do nothing
 */

module.exports = straw.node({
  process: function(msg, done) {
    done();
  }
});
