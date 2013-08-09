var straw = require('../../../lib/straw.js')

/*
 * receive input but do nothing
 */

module.exports = straw.node.extend({
  title: 'Consume',
  process: function(msg, done) {
    done(false);
  }
});
