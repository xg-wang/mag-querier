var restify = require('restify');

///--- API

/**
 * Returns a server with all routes defined on it
 * @param  {MagClient} client a MagClient to query data from MAG.
 */
function createServer(client) {
  // Create a server with our logger and custom formatter
  // Note that 'version' means all routes will default to
  // 1.0.0
  var server = restify.createServer({
    name: 'querier'
  });

  server.client = client;

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
    var id1 = parseInt(req.params.id1);
    var id2 = parseInt(req.params.id2);
    var ids = {id1: id1, id2: id2};
    var response = {};
    var promiseArr = [];
    var client = this.client;

    for (var idx in ids) {
      var prom = new Promise(function(resolve, reject) {
        client.get(ids[idx], function(err, obj) {
          if (!err) {
            response[ids[idx].toString()] = obj;
            resolve();
          } else {
            console.log("err when client GET.");
          }
        });
      });
      promiseArr.push(prom);
    }

    Promise.all(promiseArr).then(function() {
      res.send({
        response: response,
        /* fake results */
        oneHop: [[id1,id2]],
        twoHop: [[id1,3,id2], [id1,4,id2]],
        threeHop: [[id1,4,3,id2], [id1,6,4,id2]]
      });
    })

  }

  return (server);
}

///--- Exports

module.exports = {
  createServer: createServer
};
