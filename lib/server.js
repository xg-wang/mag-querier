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
    var RequestCase = 4;
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
      RequestCase = Utils.switchCaseById(requestIds, responses);
      console.log("Promise.all start. case: " +
                  RequestCase);
      var e1 = responses[id1].entities;
      var e2 = responses[id2].entities;
      id1 = parseInt(id1);
      id2 = parseInt(id2);

      // Only case 1 contains proms, other cases would return []
      var SecLevelPromiseArr = [];

      switch (RequestCase) {
        case 1:
          // Id Id
          // Three Hop and id1->id3->id2
          // request C.CId
          if (e1[0].C) {
            SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
              // cache hit~
              var currCId = e1[0].C.CId;
              if (responses[currCId.toString()]) { resolve(); }
              client.getCId(currCId, function(err, obj) {
                if (!err) {
                  // cache it
                  responses[currCId.toString()] = obj;
                  resolve();
                } else {
                  console.log("err when client GET.");
                  reject();
                } // if (!err) else
              }); // client get
            }));
          }
          // request J.JId
          if (e1[0].J) {
            SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
              // cache hit~
              var currJId = e1[0].J.JId;
              if (responses[currJId.toString()]) { resolve(); }
              client.getJId(currJId, function(err, obj) {
                if (!err) {
                  // cache it
                  responses[currJId.toString()] = obj;
                  resolve();
                } else {
                  console.log("err when client GET.");
                  reject();
                } // if (!err) else
              }); // client get
            }));
          }
          // request each F.FId
          if (e1[0].F) {
            for (var fIdx = 0; fIdx < e1[0].F.length; fIdx++) {
              SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
                // cache hit~
                var currFId = e1[0].F[fIdx].FId;
                if (responses[currFId.toString()]) { resolve(); }
                client.getFId(currFId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currFId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET.");
                    reject();
                  } // if (!err) else
                }); // client get
              }));
            }
          }
          // request each AA.AuId
          if (e1[0].AA) {
            for (var aIdx = 0; aIdx < e1[0].AA.length; aIdx++) {
              SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
                var currAuId = e1[0].AA[aIdx].AuId;
                // cache hit~
                if (responses[currAuId.toString()]) { resolve(); }
                client.getAuId(currAuId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currAuId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET.");
                    reject();
                  } // if (!err) else
                }); // client get
              }));
            }
          }
          // request each Id in RId[]
          for (var j = 0; j < e1[0].RId.length; j++) {

            var prom = new Promise(function(resolve, reject) {
              var currRId = e1[0].RId[j];
              // cache hit~
              if (responses[currRId.toString()]) { resolve(); }
              // cache the currIdx otherwise i is 2!
              client.getId(currRId, function(err, obj) {
                if (!err) {
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
          console.log(SecLevelPromiseArr.length);
          // One Hop
          if (id2 in e1[0].RId) {oneHop.push([id1, id2]);}
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

      var ThirdLevelPromiseArr = [];
      Promise.all(secArr).then(function () {
        console.log("Second stage Promise start:");
        // Only deal with case 1
        if (secArr.length != 0) {
          var e1 = responses[id1].entities[0];
          var e2 = responses[id2].entities[0];
          id1 = parseInt(id1);
          id2 = parseInt(id2);

          // request for 3rd level responses
          // Id1 ==> Id3 ==> Id4 ==> Id2
          var RId1Arr = responses[id1.toString()].entities[0].RId;
          for (var RId1Idx = 0; RId1Idx < RId1Arr.length; RId1Idx++) {
            var RId2Arr = responses[RId1Arr[RId1Idx]].entities[0].RId;
            for (var RId2Idx = 0; RId2Idx < RId2Arr.length; RId2Idx++) {
              ThirdLevelPromiseArr.push(new Promise(function(resolve, reject) {
                var currRId = RId2Arr[RId2Idx];
                // cache hit~
                if (responses[currRId.toString()]) { resolve(); }
                client.getId(currRId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currRId.toString()] = obj;
                    console.log('get 4id');
                    resolve();
                  } else {
                    console.log("err when client GET.");
                    reject();
                  } // if (!err) else
                }); // client get
              }));
            }
          }

          // Tree Hops
          if (e1.C) {
            // Id1 ==> C.Cid ==> Id3 ==> Id2
            responses[e1.C.CId.toString()].entities.find(function(ele) {
              if (id2 in ele.RId) {
                threeHop.push([id1, e1.C.CId, ele.Id, id2]);
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
          console.log("Second stage Promise: e1 e2 C done.");
          if (e1.J) {
            // Id1 ==> J.Jid ==> Id3 ==> Id2
            responses[e1.J.JId.toString()].entities.find(function(ele) {
              if (id2 in ele.RId) {
                threeHop.push([id1, e1.J.JId, ele.Id, id2]);
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
          console.log("Second stage Promise: e1 e2 J done.");
          if (e1.F) {
            // Id1 ==> F.Fid ==> Id3 ==> Id2
            for (var fIdx = 0; fIdx < e1.F.length; fIdx++) {
              console.log(responses[e1.F[fIdx].FId.toString()]);
              responses[e1.F[fIdx].FId.toString()].entities.find(function(ele) {
                if (id2 in ele.RId) {
                  threeHop.push([id1, e1.F[fIdx].FId, ele.Id, id2]);
                }
              });
            }
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
          console.log("Second stage Promise: e1 e2 F done.");
          if (e1.AA) {
            // Id1 ==> AA.AuId ==> Id3 ==> Id2
            e1.AA.find(function(ele) {
              responses[ele.AuId.toString()].entities.find(function (aaEn) {
                if (id2 in aaEn.RId) {
                  threeHop.push([id1, ele.AuId, aaEn.Id, id2]);
                }
              });
            });
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
          console.log("Second stage Promise: e1 e2 AA done.");
          // Two Hops
          // id1 ==> id3 ==> id2
          e1.RId.find(function(ele) {
            var eleEn = responses[ele.toString()].entities[0];
            if (id2 in eleEn.RId) {
              twoHop.push([id1, ele, id2]);
            }
          });
          console.log("Second stage Promise: e1 e2 RId done.");
        } // if secArr
        console.log(ThirdLevelPromiseArr.length);
        return ThirdLevelPromiseArr;
      }).then(function(thirdArr) {

        Promise.all(thirdArr).then(function () {
          console.log("Third stage Promise start:");

          if (RequestCase == 1) {
            // Id1 ==> Id3 ==> Id4 ==> Id2
            var RId1Arr = responses[id1.toString()].entities[0].RId;
            for (var RId1Idx = 0; RId1Idx < RId1Arr.length; RId1Idx++) {
              var RId2Arr = responses[RId1Arr[RId1Idx]].entities[0].RId;
              for (var RId2Idx = 0; RId2Idx < RId2Arr.length; RId2Idx++) {
                var currRId = RId2Arr[RId2Idx];
                if (id2 in responses[currRId.toString()].entities[0].RId) {
                  threeHop.push([id1, RId1Arr[RId1Idx], currRId, id2]);
                }
              }
            }
          }

          // the final return arrays
          console.log('ready to send.');

          res.send(oneHop.concat(twoHop, threeHop));
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
