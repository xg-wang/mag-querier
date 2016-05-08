# MAG-QUERIER

This [restify.js](http://restify.com/) demo if for the msra competiton.

## usage
```javascript
npm install restify
node main.js
```

Then simply turn on the browser and goto <http://localhost/8080/paths?id1=:id1&id2=:id2>

say <http://localhost/8080/paths?id1=2140251881&id2=2140251882>

## hints
- `lib/client.js` creates a MAG client to query from the Microsoft website for entity data;
- `lib/server.js` creates a local REST endpoint to handle to actual input pair, uses the client to query MAG. Promise is used to perform asycronous IO.

## TODO
- The algorithm should be implemented in server `function queryPaths(req, res, next){}`.
- add middlewares
- add HTTP error code responds

# Possible Connections
## 按连接数
**OneHop:**
Id1 == Id2
AA.AuId1 == Id2
Id1 == AA.AuId2

**TwoHop:**
分四种情况
1、Id1到Id2
Id1 == F.Fid == Id2
Id1 == C.Cid == Id2
Id1 == J.Jid == Id2
Id1 == Id == Id2(?有没有可能)
Id1 == AA.AuId == Id2
2、Id1到AA.AuId2
Id1 == Id == AA.AuId2
3、AA.AuId1到Id2
AA.AuId1 == Id == Id2
4、AA.AuId1到AA.AuId2
AA.AuId1 == Id == AA.AuId2
AA.AuId1 == AA.AFid == AA.AuId2
(OneHop和TwoHop都不存在环的问题)

**ThreeHop:**
分四种情况：
1、Id1到Id2
Id1 == F.Fid == Id == Id2(可成环)
Id1 == C.Cid == Id == Id2(可成环)
Id1 == J.Jid == Id == Id2(可成环)
Id1 == AA.AuId == Id == Id2(可成环)

Id1 == Id == F.Fid == Id2
Id1 == Id == C.Cid == Id2
Id1 == Id == J.Jid == Id2
Id1 == Id == AA.AuId == Id2

Id1 == Id == Id == Id2(应该少见)
2、Id1到AA.AuId2
Id1 == F.Fid == Id == AA.AuId2(可成环)
Id1 == C.Cid == Id == AA.AuId2(可成环)
Id1 == J.Jid == Id == AA.AuId2(可成环)
Id1 == Id == Id == AA.AuId2(可成环,应该少见)

Id1 == AA.AuId == Id == AA.AuId2(也可以成环)
Id1 == AA.AuId == AA.AFid == AA.AuId2
3、AA.AuId1到Id2

## 按请求
### Id Id
**OneHop:**
Id1 == Id2

**TwoHop:**
Id1 == F.Fid == Id2
Id1 == C.Cid == Id2
Id1 == J.Jid == Id2
Id1 == Id == Id2(?有没有可能)
Id1 == AA.AuId == Id2

**ThreeHop:**
Id1 == F.Fid == Id == Id2(可成环)
Id1 == C.Cid == Id == Id2(可成环)
Id1 == J.Jid == Id == Id2(可成环)
Id1 == AA.AuId == Id == Id2(可成环)

### AuId Id

### Id AuId

### AuId AuId