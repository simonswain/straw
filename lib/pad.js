"use strict";

var zeropad = function(number, width) {
  width = width || 2;
  width -= number.toString().length;
  if ( width > 0 )  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number;
};

var spacepad = function(s, width) {
  var x;
  width = width || 32;
  s = s.substr(0, width).trim();
  x = width - s.length;
  if (x === 0) {
    return s;
  }
  return s + new Array(x + 1).join(' ');
};

var timestamp = function() {
  var d = new Date();
  var s;
  s = d.getFullYear();
  s += '-' + zeropad(d.getMonth()+1);
  s += '-' + zeropad(d.getDate());
  s += ' ' + zeropad(d.getHours());
  s += ':' + zeropad(d.getMinutes());
  s += ':' + zeropad(d.getSeconds());
  return s;
};

module.exports = {
  zero: zeropad,
  space: spacepad,
  timestamp: timestamp
};
