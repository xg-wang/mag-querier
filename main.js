var restify = require('restify');

var querier = require('./lib');


///--- Globals


///--- Helpers


///--- Mainline

(function main() {
  var server = querier.createServer();

  server.listen((8080), function onListening() {
      console.log('listening at %s', server.url);
  });
})();
