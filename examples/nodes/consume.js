var straw = require('../../lib/straw.js')

/*
 * receive input but do nothing
 */

module.exports = straw.node.extend({
  process: function(msg, done) {
    done(false);
  }
});
