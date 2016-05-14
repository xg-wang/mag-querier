var restify = require('restify');

var querier = require('./lib');


///--- Globals


///--- Helpers


///--- Mainline
(function main() {
  var client = querier.createClient();
  var server = querier.createServer(client);

  server.listen(80, function onListening() {
      console.log('listening at %s', server.url);
  });
})();
