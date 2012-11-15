env = process.env.NODE_ENV || 'development';

var redis = {
  host: '127.0.0.1',
  port: 6379
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

