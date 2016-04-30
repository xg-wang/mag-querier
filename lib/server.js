var restify = require('restify');

///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer() {
  // Create a server with our logger and custom formatter
  // Note that 'version' means all routes will default to
  // 1.0.0
  var server = restify.createServer({
  name: 'querier'
  });

  // Use the common stuff you probably want
  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.dateParser());
  server.use(restify.authorizationParser());
  server.use(restify.queryParser());
  server.use(restify.gzipResponse());
  server.use(restify.bodyParser());

  // user can only GET the paths results
  server.get('/paths/:id1/:id2', queryPaths);

  function queryPaths(req, res, next){
    var id1 = req.params.id1;
    var id2 = req.params.id2;
    res.send({
      oneHop: [[id1,id2]],
      twoHop: [[id1,3,id2], [id1,4,id2]],
      threeHop: [[id1,4,3,id2], [id1,6,4,id2]]
    });
  }

  return (server);
}

///--- Exports

module.exports = {
  createServer: createServer
};
