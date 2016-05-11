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
    var childrenRes = { id1: [], id2: [] };
    var TopLevelPromiseArr = [];
    var client = this.client;

    for (var i = 0; i < requestIds.length; i++) {
      console.log(requestIds[i]);
      var prom = new Promise(function(resolve, reject) {
        // cache the currIdx otherwise i is 2!
        var currIdx = i;
        client.getIdOrAuId(requestIds[currIdx], function(err, obj) {
          if (!err) {
            // TODO: is there anything todo here?
            // if (obj.isId) {
            // } else {
            // }

            // TODO: put this to db?
            console.log(currIdx);
            responses[requestIds[currIdx]] = obj;
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
      // prom.then(function(obj) {
      //   // perform Id or AuId specific handling
      //   if (obj.isId) {
      //     // Now it is an Id, connects `F.Fid, J.JId, C.CId, AA.AuId`
      //     // only 1 entity, has RId, AA, F, J, C
      //     // require further request of AA.AuId(s)
      //     var authorArray = obj.entities[0].AA;
      //     if (!authorArray) {
      //       // this actually means it's not an Id, and we don't further request
      //       reject();
      //     } else {
      //       // request for every AuId in Id.entities[0].AA
      //       var aaPromArr = [];
      //       for (var j = 0; j < authorArray.length; j++) {
      //         var aaProm = new Promise(function(resolve, reject) {
      //           var aa = authorArray[j];
      //           client.getAuId(aa.AuId, function (err, obj) {
      //             if (!err) {
      //               // TODO: use db?
      //               childrenRes[requestIds[i]].push(obj);
      //             } else {
      //               console.log("err when client GET AA[" + j + "].AuId: "
      //                           + aa.AuId);
      //             }
      //             resolve(obj);
      //           });
      //         }); // new Promise
      //         aaPromArr.push(aaProm);
      //       } // for
      //       Promise.all(aaPromArr).then(function (obj) {
      //           console.log("children Ids of Id" + i + "ready");
      //       });
      //     } // if (obj.isId) else
      //   } else {
      //     // Now it is a AuId, connects `Id, AA.AfId`
      //     // each entity has Id, AA, F, J, C
      //     // require further request of Id(s)
      //     // For Ids, the third level is simpler,
      //     // since AuId.entities[j].id already contains the thirdLevel info
      //     // but we still need to further request for Ids to campare with reqIds
      //     // thus we should use client.getSimpleAuId to reduce delay
      //     var aaPromArr = [];
      //     for (var j = 0; j < obj.entities.length; j++) {
      //       // each entity contains a paper Id and several AuIds
      //       var entity = obj.entities[j];
      //       if (!entity.AA) continue;
      //       for (var k = 0; k < entity.AA.length; k++) {
      //         var aaProm = new Promise(function(resolve, reject) {
      //           client.getSimpleAuId(entity.AA[k].AuId, function(err, obj) {
      //             if (!err) {
      //               // TODO: use db?
      //               // need to consider how to store third level info!

      //             } else {
      //               console.log("err when client GET AA[" + k + "].AuId: "
      //                           + entity.AA[k].AuId);
      //             }
      //           });
      //         }); // new Promise
      //       } // for entity.AA
      //     } // for obj.entities
      //   }
      // });

    }

    // id1, id2 ready
    Promise.all(TopLevelPromiseArr).then(function() {
      console.log(responses);
      console.log("Promise.all start. case: " +
                  Utils.switchCaseById(requestIds, responses));
      var e1 = responses[id1].entities;
      var e2 = responses[id2].entities;

      console.log(e1[0]);
      console.log(e2[0]);

      switch (Utils.switchCaseById(requestIds, responses)) {
        case 1:
          // Id Id
          // One Hop
          if (id1 in e2[0].RId ||
              id2 in e1[0].RId) {oneHop.push([id1, id2]);}
          console.log(oneHop);
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
          for (var i = 0; i < e1.RId.length; i++) {
            if (e1.RId[i] in e2.RId) {twoHop.push([id1, e1.RId[i], id2]);}
          }
          console.log(twoHop);
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
    });


  }

  return (server);
}

///--- Exports

module.exports = {
  createServer: createServer
}
