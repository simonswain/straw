var straw = require('../../../lib/straw.js')

/*
 * outputs whatever is received. This is in effect the prototype
 * worker node
 */

module.exports = straw.node.extend({
  title: 'Passthru'
});
