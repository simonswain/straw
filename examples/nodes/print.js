var straw = require('../../lib/straw.js')

/*
 * print received input to console
 */

module.exports = straw.node({
  process: function(msg, done) {
    console.log(JSON.stringify(msg));
    done(false);
  }
});
