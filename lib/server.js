var restify = require('restify');

///--- Helpers
var Utils = (function () {
  /**
   * query Id but actually AuId
   * @param  {Object} obj
   * @return true if not an Id
   */
  isNotId = function(obj) {
    return !obj.entities[0].AA;
  }
  
  return {
    isNotId: isNotId,
  }
});

///--- API

/**
 * Returns a server with all routes defined on it
 * @param  {MagClient} client a MagClient to query data from MAG.
 */
function createServer(client) {
  var server = restify.createServer({
    name: 'querier'
  });

  server.client = client;

  // Use the common stuff you probably want
  server.use(restify.queryParser({ mapParams: false }));

  // user can only GET the paths results
  server.get('/paths', queryPaths);

  function queryPaths(req, res, next){
    // return arrays
    var oneHop = [];
    var twoHop = [];
    var threeHop = [];
    // requested Ids
    var id1 = req.query.id1;
    var id2 = req.query.id2;
    
    var reqestIds = [id1, id2];
    var response = {};
    var promiseArr = [];
    var client = this.client;

    for (var i in reqestIds) {
      
      var prom = new Promise(function(resolve, reject) {
        client.getId(reqestIds[i], function(err, obj) {
          if (!err) {
            obj.isId = true;
            // if not Id, treat it as AuId
            if (isNotId(obj)) {
              client.getId(reqestIds[i], function(err, obj) {
                if (!err) {
                  // Now it is a AuId, need `Id, AA.AfId`
                  obj.isId = false;
                  response[reqestIds[i].toString()] = obj;
                  resolve();
                } else {
                  console.log("err when client GET");
                  reject();
                }
              });
            } else {
              // Now it is a Id, need `F.Fid, J.JId, C.CId, AA.AuId`
              response[reqestIds[i].toString()] = obj;
              resolve();
            };
            // TODO: for dubug
            console.log(JSON.stringify(obj, null, 2));
          } else {
            console.log("err when client GET.");
            reject();
          }
        });
      });
      
      promiseArr.push(prom);
      
    }

    Promise.all(promiseArr).then(function() {
      // the final return arrays
      res.send({
        oneHop: oneHop,
        twoHop: twoHop,
        threeHop: threeHop,
      });
    })

  }

  return (server);
}

///--- Exports

module.exports = {
  createServer: createServer
};
