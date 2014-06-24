"use strict";

var fork = require('child_process').fork;
var node = require('../lib/node.js');

var myNode;

exports['node'] = {
  'new': function(test) {

    //console.log(node);
    
    myNode = node.create({
    });

    test.done();

  }
  
};
