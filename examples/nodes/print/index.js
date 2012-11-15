var straw = require('../../../lib/straw.js')

/*
 * print received input to console
 */

module.exports = straw.node.extend({
  title: 'Print',
  total: 0,
  process: function(msg, done) {
    console.log( JSON.stringify(msg));
  }
});
