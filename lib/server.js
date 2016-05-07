var restify = require('restify');

///--- Helpers


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
    var responses = {};
    var childrenRes = { id1: [], id2: [] };
    var TopLevelPromiseArr = [];
    var client = this.client;

    for (var i in reqestIds) {
      
      var prom = new Promise(function(resolve, reject) {
        client.getIdOrAuId(reqestIds[i], function(err, obj) {
          if (!err) {
            // TODO: is there anything todo here?
            // if (obj.isId) {
            // } else {
            // }
            
            // TODO: put this to db?
            responses[reqestIds[i]] = obj;
            resolve(obj);
            // TODO: for dubug
            console.log(JSON.stringify(obj, null, 2));
          } else {
            console.log("err when client GET.");
            reject();
          } // if (!err) else
        }); // client get
      });
      
      TopLevelPromiseArr.push(prom);
      
      // get children Ids regarding Id / AuId
      prom.then(function(obj) {
        // perform Id or AuId specific handling
        if (obj.isId) {
          // Now it is an Id, connects `F.Fid, J.JId, C.CId, AA.AuId`
          // only 1 entity, has RId, AA, F, J, C
          // require further request of AA.AuId(s)
          authorArray = obj.entities[0].AA;
          if (!authorArray) {
            // this actually means it's not an Id, and we don't further request
            reject();
          } else {
            // request for every AuId in Id.entities[0].AA
            var aaPromArr = [];
            for (var j = 0; j < authorArray.length; j++) {
              var aaProm = new Promise(function(resolve, reject) {
                var aa = authorArray[j];
                client.getAuId(aa.AuId, function (err, obj) {
                  if (!err) {
                    // TODO: use db?
                    childrenRes[reqestIds[i]].push(obj);
                  } else {
                    console.log("err when client GET AA[" + j + "].AuId");
                  }
                  resolve(obj);
                });
              }); // new Promise
              aaPromArr.push(aaProm);
            } // for
            Promise.all(aaPromArr).then(function (obj) {
                console.log("children Ids of Id" + i + "ready");
            });
          } // if (obj.isId) else
        } else {
          // Now it is a AuId, connects `Id, AA.AfId`
          // each entity has Id, AA, F, J, C
          // require further request of Id(s)
          // For Ids, the third level is simpler,
          // since AuId.entities[j].id already contains the thirdLevel info
          // but we still need to further request for Ids to campare with reqIds
          // thus we should use client.getSimpleAuId to reduce delay
          
          // TODO!
          
        }
      });
      
      
    }

    Promise.all(TopLevelPromiseArr).then(function() {
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
}
