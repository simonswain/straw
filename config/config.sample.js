env = process.env.NODE_ENV || 'development';

var redis = {
  host: '127.0.0.1',
  port: 6379
};

var statsd = {
  prefix: 'straw',
  host: '127.0.0.1',
  port: 8125
};

switch (env) {
case 'test' :
  break;

case 'development' :
  break;

case 'staging' :
  break;

case 'production' :
  break;
}

exports.redis = redis;
exports.statsd = statsd;

