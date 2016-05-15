var restify = require('restify');

var DEBUG_PRINT = true;

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
var responses = {};
function createServer(client) {
  var server = restify.createServer({
    name: 'querier'
  });

  server.client = client;

  // Use the common stuff you probably want
  server.use(restify.queryParser({ mapParams: false }));

  // user can only GET the paths results
  server.get('/paths', queryPaths);

  //print start time
  if (DEBUG_PRINT) {
    var curStart = new Date()
    console.log(curStart.Seconds());
  }
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

    var TopLevelPromiseArr = [];
    var client = this.client;

    for (var i = 0; i < requestIds.length; i++) {
      if (DEBUG_PRINT) {console.log(requestIds[i]);}
      var prom = new Promise(function(resolve, reject) {
        // cache the currIdx otherwise i is 2!
        var currIdx = i;
        client.getIdOrAuId(requestIds[currIdx], function(err, obj) {
          if (!err) {
            if (DEBUG_PRINT) {console.log("currIdx: " + currIdx);}
            responses[requestIds[currIdx]] = obj;
            resolve(obj);
            // console.log(JSON.stringify(obj, null, 2));
          } else {
            console.log("err when client GET:" + currIdx);
            console.log(err);
            reject();
          } // if (!err) else
        }); // client get
      });

      TopLevelPromiseArr.push(prom);
    } // for

    // id1, id2 ready
    Promise.all(TopLevelPromiseArr)
      .then(function() {
      RequestCase = Utils.switchCaseById(requestIds, responses);
      if (DEBUG_PRINT) {console.log("Promise.all start. case: " + RequestCase);}
      var e1 = responses[id1].entities;
      var e2 = responses[id2].entities;
      id1 = parseInt(id1);
      id2 = parseInt(id2);

      var SecLevelPromiseArr = [];
      var ThirdLevelPromiseArr = [];

      switch (RequestCase) {
        case 1:
          // Id Id
          // Three Hop and id1->id3->id2
          // request each Id in RId[]
          for (var j = 0; j < e1[0].RId.length; j++) {

            var prom = new Promise(function(resolve, reject) {
              var currRId = e1[0].RId[j];
              if (responses[currRId.toString()]) {
                if (DEBUG_PRINT) {console.log("cache hit: " + currRId);}
                resolve();
              } else {
                // cache the currIdx otherwise i is 2!
                client.getId(currRId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currRId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET Id in RId: " + currRId);
                    console.log(err);
                    reject();
                  } // if (!err) else
                }); // client get
              }
            });
            ThirdLevelPromiseArr.push(prom);
            SecLevelPromiseArr.push(prom);
          }
          Promise.all(ThirdLevelPromiseArr)
            .then(function() {
              // request for 3rd level responses
              // Id1 ==> Id3 ==> Id4 ==> Id2
              var RId1Arr = responses[id1.toString()].entities[0].RId;
              for (var RId1Idx = 0; RId1Idx < RId1Arr.length; RId1Idx++) {
                var RId2Arr = responses[RId1Arr[RId1Idx]].entities[0].RId;
                for (var RId2Idx = 0; RId2Idx < RId2Arr.length; RId2Idx++) {
                  ThirdLevelPromiseArr.push(new Promise(function(resolve, reject) {
                    var currRId = RId2Arr[RId2Idx];
                    if (responses[currRId.toString()]) {
                      if (DEBUG_PRINT) {console.log("cache hit: " + currRId);}
                      resolve();
                    } else {
                      client.getId(currRId, function(err, obj) {
                        if (!err) {
                          // cache it
                          responses[currRId.toString()] = obj;
                          // console.log('get 4id');
                          resolve();
                        } else {
                          console.log("err when client GET Id: " + currRId);
                          console.log(err);
                          reject();
                        } // if (!err) else
                      }); // client get
                    }
                  }));
                }
              }
            });

          // request C.CId
          if (e1[0].C) {
            SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
              var currCId = e1[0].C.CId;
              if (responses[currCId.toString()]) {
                if (DEBUG_PRINT) {console.log("cache hit: " + currCId);}
                resolve();
              } else {
                client.getCId(currCId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currCId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET CId: " + currCId);
                    console.log(err);
                    reject();
                  } // if (!err) else
                }); // client get
              }
            }));
          }
          // request J.JId
          if (e1[0].J) {
            SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
              var currJId = e1[0].J.JId;
              if (responses[currJId.toString()]) {
                if (DEBUG_PRINT) {console.log("cache hit: " + currJId);}
                resolve();
              } else {
                client.getJId(currJId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currJId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET JId: " + currJId);
                    console.log(err);
                    reject();
                  } // if (!err) else
                }); // client get
              }
            }));
          }
          // request each F.FId
          if (e1[0].F) {
            for (var fIdx = 0; fIdx < e1[0].F.length; fIdx++) {
              SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
                var currFId = e1[0].F[fIdx].FId;
                if (responses[currFId.toString()]) {
                  if (DEBUG_PRINT) {console.log("cache hit: " + currFId);}
                  resolve();
                } else {
                  client.getFId(currFId, function(err, obj) {
                    if (!err) {
                      // cache it
                      responses[currFId.toString()] = obj;
                      resolve();
                    } else {
                      console.log("err when client GET FId: " + currFId);
                      console.log(err);
                      reject();
                    } // if (!err) else
                  }); // client get
                }
              }));
            }
          }
          // request each AA.AuId
          if (e1[0].AA) {
            for (var aIdx = 0; aIdx < e1[0].AA.length; aIdx++) {
              SecLevelPromiseArr.push(new Promise(function(resolve, reject) {
                var currAuId = e1[0].AA[aIdx].AuId;
                if (responses[currAuId.toString()]) {
                  if (DEBUG_PRINT) {console.log("cache hit: " + currAuId);}
                  resolve();
                } else {
                  client.getAuId(currAuId, function(err, obj) {
                    if (!err) {
                      // cache it
                      responses[currAuId.toString()] = obj;
                      resolve();
                    } else {
                      console.log("err when client GET AuId: " + currAuId);
                      console.log(err);
                      reject();
                    } // if (!err) else
                  }); // client get
                }
              }));
            }
          }
          if (DEBUG_PRINT) {
            console.log("SecLevelPromArr length: " + SecLevelPromiseArr.length);
          }
          // One Hop
          if (e1[0].RId.includes(id2)) {oneHop.push([id1, id2]);}
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
            e1[0].F.forEach(function(ele) {
              for (var i = 0; i < e2[0].F.length; i++) {
                if (ele.FId == e2[0].F[i].FId) {
                  twoHop.push([id1, ele.FId, id2]);
                  break;
                }
              }
            });
          }
          if (e1[0].AA && e2[0].AA) {
            e1[0].AA.forEach(function(ele) {
              for (var i = 0; i < e2[0].AA.length; i++) {
                if (ele.AuId == e2[0].AA[i].AuId) {
                  twoHop.push([id1, ele.AuId, id2]);
                  break;
                }
              }
            });
          }
          break;

        case 2:
          // Id AuId
          // Promise Request Id1 ==> Id3 ==> Id4 ==> AA.AuId2
          for (var j = 0; j < e1[0].RId.length; j++) {
            // request each Id in RId[]
            var prom = new Promise(function(resolve, reject) {
              var currRId = e1[0].RId[j];
              if (responses[currRId.toString()]) {
                if (DEBUG_PRINT) {console.log("cache hit: " + currRId);}
                resolve();
              } else {
                // cache the currIdx otherwise i is 2!
                client.getId(currRId, function(err, obj) {
                  if (!err) {
                    // cache it
                    responses[currRId.toString()] = obj;
                    resolve();
                  } else {
                    console.log("err when client GET Id: " + currRId);
                    console.log(err);
                    reject();
                  } // if (!err) else
                }); // client get
              }
            });

            SecLevelPromiseArr.push(prom);
          }
          // One Hop
          if (e1[0].AA) {
            for (var i = 0; i < e1[0].AA.length; i++) {
              if (id2 == e1[0].AA[i].AuId) {
                oneHop.push([id1, id2]);
                break;
              }
            }
          }
          // Two Hop
          // Id1 ==> Id2 ==> AA.AuId2
          e2.forEach(function(e2En) {
            if (e1[0].RId.includes(e2En.Id)) {
              twoHop.push([id1, e2En.Id, id2]);
            }
          });
          // Three Hop
          //Id1 ==> AA.AuId3 ==> AA.Afid ==> AA.AuId2
          var e2AfIdSet = new Set();
          e2.forEach(function(e2En) {
            e2En.AA.forEach(function(e2aa) {
              if (e2aa.AuId == id2 && e2aa.AfId) {
                e2AfIdSet.add(e2aa.AfId);
              }
            });
          })
          Array.from(e2AfIdSet).map(function(e2AfId) {
            e1[0].AA.forEach(function(e1aa) {
              if (e1aa.AfId && e1aa.AfId == e2AfId) {
                threeHop.push([id1, e1aa.AuId, e2AfId, id2]);
              }
            });
          });
          // Id1 ==> AA.AuId3 ==> Id4 ==> AA.AuId2
          e2.forEach(function(e2En) {
            e2En.AA.forEach(function(e2aa) {
              e1[0].AA.forEach(function(e1aa) {
                if (e1aa.AuId == e2aa.AuId) {
                  threeHop.push([id1, e1aa.AuId, e2En.Id, id2]);
                }
              });
            });
          });
          // Id1 ==> F.Fid ==> Id3 ==> AA.AuId2
          if (e1[0].F) {
            e1[0].F.forEach(function(e1f) {
              e2.forEach(function(e2En) {
                if (e2En.F) {
                  e2En.F.forEach(function(e2f) {
                    if (e1f.FId == e2f.FId) {
                      threeHop.push([id1, e1f.FId, e2En.Id, id2]);
                    }
                  });
                }
              });
            });
          }
          // Id1 ==> C.Cid ==> Id3 ==> AA.AuId2
          if (e1[0].C) {
            e2.forEach(function(e2En) {
              if (e2En.C) {
                if (e1[0].C.CId == e2En.C.CId) {
                  threeHop.push([id1, e2En.C.CId, e2En.Id, id2]);
                }
              }
            });
          }
          // Id1 ==> J.Jid ==> Id3 ==> AA.AuId2
          if (e1[0].J) {
            e2.forEach(function(e2En) {
              if (e2En.J) {
                if (e1[0].J.JId == e2En.J.JId) {
                  threeHop.push([id1, e2En.J.JId, e2En.Id, id2]);
                }
              }
            });
          }

          break;

        case 3:
          // AuId Id
          // Promise Request AA.AuId1 ==> Id3 ==> Id4 ==> Id2
          e1.forEach(function(e1En) {
            e1En.RId.forEach(function(id4) {
              // request each Id in RId[]
              var prom = new Promise(function(resolve, reject) {
                if (responses[id4.toString()]) {
                  if (DEBUG_PRINT) {console.log("id4 cache hit: " + id4);}
                  resolve();
                } else {
                  // console.log("try to GET " + id4.toString());
                  client.getId(id4, function(err, obj) {
                    if (!err) {
                      // cache it
                      responses[id4.toString()] = obj;
                      resolve();
                    } else {
                      console.log("err when client GET Id: " + id4);
                      console.log(err);
                      reject();
                    } // if (!err) else
                  }); // client get
                }
              });
              SecLevelPromiseArr.push(prom);
            });
          });
          if (DEBUG_PRINT) {
            console.log("SecLevelPromiseArr len: " + SecLevelPromiseArr.length);
          }
          // One Hop
          if (e2[0].AA) {
            for (var e1Idx = 0; e1Idx < e1.length; e1Idx++) {
              if (e1[e1Idx].Id == id2) {
                oneHop.push([id1, id2]);
                break;
              }
            }
          }
          // Two Hop
          // AA.AuId1 ==> Id3 ==> Id2
          e1.forEach(function(e1En) {
            if (e1En.RId.includes(id2)) {
              twoHop.push([id1, e1En.Id, id2]);
            }
          });
          // Three Hop
          // AA.AuId1 ==> Id3 ==> AA.AuId4 ==> Id2
          e1.forEach(function(e1En) {
            e1En.AA.forEach(function(e1aa) {
              for (var e2aaIdx = 0; e2aaIdx < e2[0].AA.length; e2aaIdx++) {
                if (e2[0].AA[e2aaIdx].AuId == e1aa.AuId) {
                  threeHop.push([id1, e1En.Id, e1aa.AuId, id2]);
                  break;
                }
              }
            });
          });
          // AA.AuId1 ==> AA.AFid ==> AA.AuId4 ==> Id2
          var e1AfIfSet = new Set();
          e1.forEach(function(e1En) {
            e1En.AA.forEach(function(e1aa) {
              if (e1aa.AuId == id1 && e1aa.AfId) { e1AfIfSet.add(e1aa.AfId); }
            });
          });
          Array.from(e1AfIfSet).forEach(function(afid) {
            e2[0].AA.forEach(function(e2aa) {
              if (e2aa.AfId && e2aa.AfId == afid) {
                threeHop.push([id1, afid, e2aa.AuId, id2]);
              }
            });
          });
          // AA.AuId1 ==> Id3 ==> F.Fid ==> Id2
          if (e2[0].F) {
            e2[0].F.forEach(function(e2fid) {
              e1.forEach(function(e1En) {
                if (e1En.F) {
                  for (var e1fIdx = 0; e1fIdx < e1En.F.length; e1fIdx++) {
                    if (e1En.F[e1fIdx] == e2fid) {
                      threeHop.push([id1, e1En.Id, e2fid, id2]);
                      break;
                    }
                  }
                }
              });
            });
          }
          // AA.AuId1 ==> Id3 ==> C.Cid ==> Id2
          if (e2[0].C) {
            e2cid = e2[0].C.CId;
            e1.forEach(function(e1En) {
              if (e1En.C && e1En.C.CId == e2cid) {
                threeHop.push([id1, e1En.Id, e2cid, id2]);
              }
            });
          }
          // AA.AuId1 ==> Id3 ==> J.Jid ==> Id2
          if (e2[0].J) {
            e2jid = e2[0].J.JId;
            e1.forEach(function(e1En) {
              if (e1En.J && e1En.J.JId == e2jid) {
                threeHop.push([id1, e1En.Id, e2jid, id2]);
              }
            });
          }

          break;

        case 4:
          // AuId AuId
          // Two Hop
          // AA.AuId1 ==> Id3 ==> AA.AuId2
          e1.forEach(function(currEn) {
            for (var enIdx = 0; enIdx < currEn.AA.length; enIdx++) {
              if (currEn.AA[enIdx].AuId == id2) {
                twoHop.push([id1, currEn.Id, id2]);
                break;
              }
            }
          });
          // AA.AuId1 ==> AA.AFid ==> AA.AuId2
          // prepare AA2.AfId[]
          var e2AfId = new Set();
          e2.forEach(function(e2En) {
            var e2aa = e2En.AA;
            for (var aaIdx = 0; aaIdx < e2aa.length; aaIdx++) {
              if (e2aa[aaIdx].AuId == id2) {
                if (e2aa[aaIdx].AfId) { e2AfId.add(e2aa[aaIdx].AfId); }
                break;
              }
            }
          });
          var AfIdSet = new Set();
          e1.forEach(function(currEn) {
            // currEn.AA.forEach(function(ele) {
            for (var eleIdx = 0; eleIdx < currEn.AA.length; eleIdx++) {
              var ele = currEn.AA[eleIdx];
              if (ele.AuId == id1) {
                // does id2 has this AfId?
                if (ele.AfId && e2AfId.has(ele.AfId)) {
                  AfIdSet.add(ele.AfId);
                }
                break;
              }
            }
          });
          Array.from(AfIdSet).map(function(afid) {
            twoHop.push([id1, afid, id2]);
          });
          // Three Hop
          // AA.AuId1 ==> Id3 ==> Id4 ==> AA.AuId2
          e1.forEach(function(currEn) {
            e2.forEach(function(rEn) {
              if (currEn.RId.includes(rEn.Id)) {
                threeHop.push([id1, currEn.Id, rEn.Id, id2]);
              }
            })
          });

        default:
          break;
      }
      return {
        "sec": SecLevelPromiseArr,
        "third": ThirdLevelPromiseArr
      };
    }).then(function (obj) {

      var secArr = obj.sec;
      var ThirdLevelPromiseArr = obj.third;
      Promise.all(secArr).then(function () {
        if (DEBUG_PRINT) {console.log("Second stage Promise start:");}
        if (secArr.length != 0) {
          switch (RequestCase) {
            case 1:
              var e1 = responses[id1].entities[0];
              var e2 = responses[id2].entities[0];
              id1 = parseInt(id1);
              id2 = parseInt(id2);

              // Three Hops
              if (e1.C) {
                // Id1 ==> C.Cid ==> Id3 ==> Id2
                responses[e1.C.CId.toString()].entities.forEach(function(ele) {
                  if (ele.RId.includes(id2)) {
                    threeHop.push([id1, e1.C.CId, ele.Id, id2]);
                  }
                });
              }
              if (e2.C) {
                // Id1 ==> Id3 ==> C.Cid ==> Id2
                e1.RId.forEach(function(ele) {
                  var childIdObjEn = responses[ele.toString()].entities[0];
                  if (childIdObjEn.C && childIdObjEn.C.CId == e2.C.CId) {
                    threeHop.push([id1, ele, e2.C.CId, id2]);
                  }
                });
              }
              if (DEBUG_PRINT) {
                console.log("Second stage Promise: e1 e2 C done.");
              }
              if (e1.J) {
                // Id1 ==> J.Jid ==> Id3 ==> Id2
                responses[e1.J.JId.toString()].entities.forEach(function(ele) {
                  if (ele.RId.includes(id2)) {
                    threeHop.push([id1, e1.J.JId, ele.Id, id2]);
                  }
                });
              }
              if (e2.J) {
                // Id1 ==> Id3 ==> J.Jid ==> Id2
                e1.RId.forEach(function(ele) {
                  var childIdObjEn = responses[ele.toString()].entities[0];
                  if (childIdObjEn.J && childIdObjEn.J.JId == e2.J.JId) {
                    threeHop.push([id1, ele, e2.J.JId, id2]);
                  }
                });
              }
              if (DEBUG_PRINT) {
                console.log("Second stage Promise: e1 e2 J done.");
              }
              if (e1.F) {
                // Id1 ==> F.Fid ==> Id3 ==> Id2
                for (var fIdx = 0; fIdx < e1.F.length; fIdx++) {
                  // console.log(responses[e1.F[fIdx].FId.toString()]);
                  responses[e1.F[fIdx].FId.toString()].entities.forEach(function(ele) {
                    if (ele.RId.includes(id2)) {
                      threeHop.push([id1, e1.F[fIdx].FId, ele.Id, id2]);
                    }
                  });
                }
              }
              if (e2.F) {
                // Id1 ==> Id3 ==> F.Fid ==> Id2
                for (var fIdx = 0; fIdx < e2.F.length; fIdx++) {
                  e1.RId.forEach(function(ele) {
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
              if (DEBUG_PRINT) {
                console.log("Second stage Promise: e1 e2 F done.");
              }
              if (e1.AA) {
                // Id1 ==> AA.AuId ==> Id3 ==> Id2
                e1.AA.forEach(function(ele) {
                  responses[ele.AuId.toString()].entities.forEach(function (aaEn) {
                    if (aaEn.RId.includes(id2)) {
                      threeHop.push([id1, ele.AuId, aaEn.Id, id2]);
                    }
                  });
                });
              }
              if (e2.AA) {
                // Id1 ==> Id3 ==> AA.AuId ==> Id2
                e1.RId.forEach(function(id3) {
                  var id3En = responses[id3.toString()].entities[0];
                  id3En.AA.forEach(function(id3aa) {
                    for (var e2aaIdx = 0; e2aaIdx < e2.AA.length; e2aaIdx++) {
                      if (e2.AA[e2aaIdx].AuId == id3aa.AuId) {
                        threeHop.push([id1, id3, id3aa.AuId, id2]);
                        break;
                      }
                    }
                  });
                });
                // for (var AAIdx = 0; AAIdx < e2.AA.length; AAIdx++) {
                //   e1.RId.forEach(function(ele) {
                //     var childIdObjEn = responses[ele.toString()].entities[0];
                //     if (childIdObjEn.AA) {
                //       for (var lAAIdx = 0; lAAIdx < childIdObjEn.AA.length; lAAIdx++) {
                //         // TODO: FIXME!!!
                //         if (childIdObjEn.AA[lAAIdx].AuId == e2.AA[AAIdx].AuId) {
                //           threeHop.push([id1, ele, e2.AA[AAIdx].AuId, id2]);
                //         }
                //       }
                //     }
                //   });
                // } // for
              }
              if (DEBUG_PRINT) {
                console.log("Second stage Promise: e1 e2 AA done.");
              }
              // Two Hops
              // id1 ==> id3 ==> id2
              e1.RId.forEach(function(ele) {
                var eleEn = responses[ele.toString()].entities[0];
                if (eleEn.RId.includes(id2)) {
                  twoHop.push([id1, ele, id2]);
                }
              });
              if (DEBUG_PRINT) {
                console.log("Second stage Promise: e1 e2 RId done.");
              }

              break;

            case 2:
              var e1 = responses[id1].entities;
              var e2 = responses[id2].entities;
              id1 = parseInt(id1);
              id2 = parseInt(id2);
              // Id1 ==> Id3 ==> Id4 ==> AA.AuId2
              e1[0].RId.forEach(function(id3) {
                var id3En = responses[id3.toString()].entities[0];
                e2.forEach(function(id4En) {
                  if (id3En.RId.includes(id4En.Id)) {
                    threeHop.push([id1, id3, id4En.Id, id2]);
                  }
                });
              });

              break;

            case 3:
              // AA.AuId1 ==> Id3 ==> Id4 ==> Id2
              var e1 = responses[id1].entities;
              var e2 = responses[id2].entities;
              id1 = parseInt(id1);
              id2 = parseInt(id2);
              e1.forEach(function(id3En) {
                id3En.RId.forEach(function(id4) {
                  var id4En = responses[id4.toString()].entities[0];
                  if (id4En.RId.includes(id2)) {
                    threeHop.push([id1, id3En.Id, id4, id2]);
                  }
                });
              });

              break;

            default:
          }
        } // if secArr
        if (DEBUG_PRINT) {
          console.log("ThirdLevelPromiseArr length: " +
                    ThirdLevelPromiseArr.length.toString());
        }
        return ThirdLevelPromiseArr;
      }).then(function(thirdArr) {

        Promise.all(thirdArr).then(function () {
          if (DEBUG_PRINT) {console.log("Third stage Promise start:");}

          if (RequestCase == 1) {
            // Id1 ==> Id3 ==> Id4 ==> Id2
            var RId1Arr = responses[id1.toString()].entities[0].RId;
            for (var RId1Idx = 0; RId1Idx < RId1Arr.length; RId1Idx++) {
              var RId2Arr = responses[RId1Arr[RId1Idx]].entities[0].RId;
              for (var RId2Idx = 0; RId2Idx < RId2Arr.length; RId2Idx++) {
                var currRId = RId2Arr[RId2Idx];
                if (responses[currRId.toString()].entities[0].RId.includes(id2)) {
                  threeHop.push([id1, RId1Arr[RId1Idx], currRId, id2]);
                }
              }
            }
          }

          // the final return arrays
          console.log('ready to send.');

          res.send(oneHop.concat(twoHop, threeHop));

          if (DEBUG_PRINT) {
            console.log("Total length: " +
                      oneHop.concat(twoHop, threeHop).length.toString());
          }
          //print end time
          if (DEBUG_PRINT) {
            var curEnd = new Date()
            console.log(curEnd.Seconds());
          }
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
