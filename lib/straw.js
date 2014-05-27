/*
 * straw
 * https://github.com/simonswain/straw
 *
 * Copyright (c) 2014 Simon Swain
 * Licensed under the MIT license.
 */


var topology = require('./topology.js');
var node =  require('./node.js');
var tap = require('./tap.js');

module.exports = {
  create: topology.create,
  node: node.create,
  tap: tap.create
};
