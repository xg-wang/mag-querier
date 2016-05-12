var restify = require('restify');

///--- Helpers
var Utils = (function () {
  switchCaseById = function(reqIds, responses) {
    if (responses[reqIds[0]].isId) {
      if (responses[reqIds[1]].isId) {
        return 1;  // Id Id
      } else {
        return 2;  // Id AuId
      }
    } else {
      if (responses[reqIds[1]].isId) {
        return 3;  // AuId Id
      } else {
        return 4;  // AuId AuId (Default)
      }
    }
  }

  return {
    switchCaseById: switchCaseById,
  }
}());

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

    var requestIds = [id1, id2];
    var responses = {};
    var childrenRes = [{}, {}];
    var TopLevelPromiseArr = [];
    var client = this.client;

    for (var i = 0; i < requestIds.length; i++) {
      console.log(requestIds[i]);
      var prom = new Promise(function(resolve, reject) {
        // cache the currIdx otherwise i is 2!
        var currIdx = i;
        client.getIdOrAuId(requestIds[currIdx], function(err, obj) {
          if (!err) {
            console.log("currIdx: " + currIdx);
            responses[requestIds[currIdx]] = obj;
            resolve(obj);
            console.log(JSON.stringify(obj, null, 2));
          } else {
            console.log("err when client GET.");
            reject();
          } // if (!err) else
        }); // client get
      });

      TopLevelPromiseArr.push(prom);
    } // for

    // id1, id2 ready
    // TODO: we can pas by parameter for the responses here!
    Promise.all(TopLevelPromiseArr)
      .then(function() {
      console.log("Promise.all start. case: " +
                  Utils.switchCaseById(requestIds, responses));
      var e1 = responses[id1].entities;
      var e2 = responses[id2].entities;
      id1 = parseInt(id1);
      id2 = parseInt(id2);

      // Only case 1 contains proms, other cases would return []
      var SecLevelPromiseArr = [];

      switch (Utils.switchCaseById(requestIds, responses)) {
        case 1:
          // Id Id
          // Three Hop
          for (var i = 0; i < requestIds.length; i++) {
            for (var j = 0; j < eval('e'+(i+1))[0].RId.length; j++) {

              var prom = new Promise(function(resolve, reject) {
                // cache the currIdx otherwise i is 2!
                var currI = i;
                var currJ = j;
                client.getId(eval('e'+(i+1))[0].RId[j], function(err, obj) {
                  if (!err) {
                    console.log(eval('e'+(currI+1))[0].RId[currJ]);
                    childrenRes[currI]
                               [eval('e'+(currI+1))[0].RId[currJ].toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET.");
                    reject();
                  } // if (!err) else
                }); // client get
              });

              SecLevelPromiseArr.push(prom);
            }
          }
          // One Hop
          if (id1 in e2[0].RId ||
              id2 in e1[0].RId) {oneHop.push([id1, id2]);}
          // Two Hop
          if (e1[0].J && e2[0].J) {
            if (e1[0].J.JId == e2[0].J.JId) {
              twoHop.push([id1, e1[0].J.JId, id2]);
            }
          }
          if (e1[0].C && e2[0].C) {
            if (e1[0].C.CId == e2[0].C.CId) {
              twoHop.push([id1, e1[0].C.CId, id2]);
            }
          }
          if (e1[0].F && e2[0].F) {
            for (var i = 0; i < e2[0].F.length; i++) {
              e1[0].F.find(function(ele) {
                if (ele.FId == e2[0].F[i].FId) {
                  twoHop.push([id1, ele.FId, id2]);
                }
              });
            }
          }
          if (e1[0].AA && e2[0].AA) {
            for (var i = 0; i < e2[0].AA.length; i++) {
              e1[0].AA.find(function(ele) {
                if (ele.AuId == e2[0].AA[i].AuId) {
                  twoHop.push([id1, ele.AuId, id2]);
                }
              });
            }
          }
          for (var i = 0; i < e1[0].RId.length; i++) {
            if (e1[0].RId[i] in e2[0].RId) {twoHop.push([id1, e1[0].RId[i], id2]);}
          }
          break;

        case 2:
          // Id AuId

          break;

        case 3:
          // AuId Id

          break;

        case 4:
          // AuId AuId
        default:


          break;
      }
      return SecLevelPromiseArr;
    }).then(function (secArr) {

      Promise.all(secArr).then(function () {
        // Only deal with case 1

        // the final return arrays
        console.log('ready to send.');
        console.log(JSON.stringify({
                      oneHop: oneHop,
                      twoHop: twoHop,
                      threeHop: threeHop,
                    }, null, 2));
        res.send({
          oneHop: oneHop,
          twoHop: twoHop,
          threeHop: threeHop,
        });
      }); // Promise

    }); // then


  }

  return (server);
}

///--- Exports

module.exports = {
  createServer: createServer
}
