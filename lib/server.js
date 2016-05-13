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
          // Three Hop and id1->id3->id2
          for (var i = 0; i < requestIds.length; i++) {
            for (var j = 0; j < eval('e'+(i+1))[0].RId.length; j++) {

              var prom = new Promise(function(resolve, reject) {
                var currI = i;
                var currJ = j;
                var currRId = eval('e'+(currI+1))[0].RId[currJ];
                // cache hit~
                if (responses[currRId.toString()]) { resolve(); }
                // cache the currIdx otherwise i is 2!
                client.getId(currRId, function(err, obj) {
                  if (!err) {
                    console.log(currRId);
                    // childrenRes[currI][currRId.toString()] = obj;
                    // cache it
                    responses[currRId.toString()] = obj;
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
        if (secArr.length != 0) {
          var e1 = responses[id1].entities[0];
          var e2 = responses[id2].entities[0];
          id1 = parseInt(id1);
          id2 = parseInt(id2);
          // Two Hops of id1->id3->id2
          // for (var i = 0; i < e1[0].RId.length; i++) {
          //   if (e1[0].RId[i] in e2[0].RId) {twoHop.push([id1, e1[0].RId[i], id2]);}
          // }
          // for (var i = 0; i < e2[0].RId.length; i++) {
          //   if (e2[0].RId[i] in e1[0].RId) {twoHop.push([id1, e2[0].RId[i], id2]);}
          // }
          // Tree Hops
          if (e1.C) {
            // Id1 <== C.Cid <== Id3 <== Id2
            e2.RId.find(function(ele) {
              var childIdObjEn = responses[ele.toString()].entities[0];
              if (childIdObjEn.C && childIdObjEn.C.CId == e1.C.CId) {
                threeHop.push([id1, e1.C.CId, ele, id2]);
              }
            });
          }
          if (e2.C) {
            // Id1 ==> Id3 ==> C.Cid ==> Id2
            e1.RId.find(function(ele) {
              var childIdObjEn = responses[ele.toString()].entities[0];
              if (childIdObjEn.C && childIdObjEn.C.CId == e2.C.CId) {
                threeHop.push([id1, ele, e2.C.CId, id2]);
              }
            });
          }
          if (e1.J) {
            // Id1 ==> Id3 ==> J.Jid ==> Id2
            e2.RId.find(function(ele) {
              var childIdObjEn = responses[ele.toString()].entities[0];
              if (childIdObjEn.J && childIdObjEn.J.JId == e1.J.JId) {
                threeHop.push([id1, e1.J.JId, ele, id2]);
              }
            });
          }
          if (e2.J) {
            // Id1 ==> Id3 ==> J.Jid ==> Id2
            e1.RId.find(function(ele) {
              var childIdObjEn = responses[ele.toString()].entities[0];
              if (childIdObjEn.J && childIdObjEn.J.JId == e2.J.JId) {
                threeHop.push([id1, ele, e2.J.JId, id2]);
              }
            });
          }
          if (e1.F) {
            // Id1 <== F.Fid <== Id3 <== Id2
            for (var fIdx = 0; fIdx < e1.F.length; fIdx++) {
              e2.RId.find(function(ele) {
                var childIdObjEn = responses[ele.toString()].entities[0];
                if (childIdObjEn.F) {
                  for (var rFIdx = 0; rFIdx < childIdObjEn.F.length; rFIdx++) {
                    if (childIdObjEn.F[rFIdx].FId == e1.F[fIdx].FId) {
                      threeHop.push([id1, e1.F[fIdx].FId, ele, id2]);
                    }
                  }
                }
              });
            } // for
          }
          if (e2.F) {
            // Id1 ==> Id3 ==> F.Fid ==> Id2
            for (var fIdx = 0; fIdx < e2.F.length; fIdx++) {
              e1.RId.find(function(ele) {
                var childIdObjEn = responses[ele.toString()].entities[0];
                if (childIdObjEn.F) {
                  for (var lFIdx = 0; lFIdx < childIdObjEn.F.length; lFIdx++) {
                    if (childIdObjEn.F[lFIdx].FId == e2.F[fIdx].FId) {
                      threeHop.push([id1, ele, e2.F[fIdx].FId, id2]);
                    }
                  }
                }
              });
            } // for
          }
          if (e1.AA) {
            // Id1 <== AA.AuId <== Id3 <== Id2
            for (var AAIdx = 0; AAIdx < e1.AA.length; AAIdx++) {
              e2.RId.find(function(ele) {
                var childIdObjEn = responses[ele.toString()].entities[0];
                if (childIdObjEn.AA) {
                  for (var rAAIdx = 0; rAAIdx < childIdObjEn.AA.length; rAAIdx++) {
                    if (childIdObjEn.AA[rAAIdx].AuId == e1.AA[AAIdx].AuId) {
                      threeHop.push([id1, e1.AA[AAIdx].AuId, ele, id2]);
                    }
                  }
                }
              });
            } // for
          }
          if (e2.AA) {
            // Id1 ==> Id3 ==> AA.AuId ==> Id2
            for (var AAIdx = 0; AAIdx < e1.AA.length; AAIdx++) {
              e1.RId.find(function(ele) {
                var childIdObjEn = responses[ele.toString()].entities[0];
                if (childIdObjEn.AA) {
                  for (var lAAIdx = 0; lAAIdx < childIdObjEn.AA.length; lAAIdx++) {
                    if (childIdObjEn.AA[lAAIdx].AuId == e2.AA[AAIdx].AuId) {
                      threeHop.push([id1, ele, e2.AA[AAIdx].AuId, id2]);
                    }
                  }
                }
              });
            } // for
          }
        } // if secArr
        // the final return arrays
        console.log('ready to send.');
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
