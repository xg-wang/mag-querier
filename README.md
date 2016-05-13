# MAG-QUERIER

This [restify.js](http://restify.com/) demo if for the msra competiton.

## usage
```javascript
npm install restify
node main.js
```

Then simply turn on the browser and goto <http://localhost/8080/paths?id1=:id1&id2=:id2>

say <http://localhost:8080/paths?id1=1982152022&id2=2147152072>

这两个Id都是Id类型，暂时用来DEBUG情况1的oneHop, twoHop.

## hints
- `lib/client.js` creates a MAG client to query from the Microsoft website for entity data;
- `lib/server.js` creates a local REST endpoint to handle to actual input pair, uses the client to query MAG. Promise is used to perform asycronous IO.

## TODO
- The algorithm should be implemented in server `function queryPaths(req, res, next){}`.
- add middlewares
- add HTTP error code responds
- RId相等是指数组还是某个元素 ==> 某元素

# Possible Connections
## 按连接数
OneHop:
Id1 == Id2
AA.AuId1 == Id2
Id1 == AA.AuId2

TwoHop:
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

ThreeHop
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
AA.AuId1 == Id == AA.AuId == Id2
AA.AuId1 == AA.AFid == AA.AuId == Id2(可成环)
AA.AuId1 == Id == F.Fid == Id2(Id可成环)
AA.AuId1 == Id == C.Cid == Id2
AA.AuId1 == Id == J.Jid == Id2

AA.AuId1 == Id == Id == Id2 
4、AA.AuId1到AA.AuId2
AA.AuId1 == Id == Id == AA.AuId2


## 按请求
我们不认为存在引用的环

### Id1, Id2
OneHop:

```
Id1 ?==? Id2(需要双向都判断)
```

TwoHop:（领域不同，会议和期刊可能相同吗）

```
Id1 <==> F.Fid <==> Id2(查询Id1和Id2的F.Fid是否相同)
Id1 <==> C.Cid <==> Id2(查询Id1和Id2的C.Cid是否相同)
Id1 <==> J.Jid <==> Id2(查询Id1和Id2的J.Jid是否相同)
Id1 <==> AA.AuId <==> Id2(查询Id1和Id2的AA.AuId是否有相同)
Id1 ?==? Id3 ?==? Id2(查询Id1的Rid(Id3)的Rid是否包括Id2,首先判断哪些Id3的F.Fid和Id2是一样的)[需要双向都判断]
```

ThreeHop: [需要对RId进一步请求得到F, J, C, AuId]

```
Id1 <==> F.Fid <==> Id3 ?==? Id2(Id3可以等于Id1)
Id1 <==> C.Cid <==> Id3 ?==? Id2(Id3可以等于Id1)
Id1 <==> J.Jid <==> Id3 ?==? Id2(Id3可以等于Id1)
Id1 <==> AA.AuId <==> Id3 ?==? Id2(Id3可以等于Id1)
Id1 ?==? Id3 <==> F.Fid <==> Id2(Id3可以等于Id2)
Id1 ?==? Id3 <==> C.Cid <==> Id2(Id3可以等于Id2)
Id1 ?==? Id3 <==> J.Jid <==> Id2(Id3可以等于Id2)
Id1 ?==? Id3 <==> AA.AuId <==> Id2(Id3可以等于Id2)
Id1 ?==? Id3 ?==? Id4 ?==? Id2(这个判断比较麻烦)
```

### Id1, AA.AuId2

OneHop：

```
Id1 ==> AA.AuId2
```

TwoHop:

```
Id1 ==> Id2 ==> AA.AuId2
```

ThreeHop:

```
Id1 ==> F.Fid ==> Id3 ==> AA.AuId2(Id3可以等于Id1)
Id1 ==> C.Cid ==> Id3 ==> AA.AuId2(Id3可以等于Id1)
Id1 ==> J.Jid ==> Id3 ==> AA.AuId2(Id3可以等于Id1)
Id1 ==> Id3 ==> Id4 ==> AA.AuId2
Id1 ==> AA.AuId3 ==> Id4 ==> AA.AuId2(Id4可以等于Id1，从而AA.AuId2和AA.AuId3共同写了Id1)
Id1 ==> AA.AuId3 ==> AA.AFid ==> AA.AuId2
```

### AA.AuId1, Id2

OneHop:

```
AA.AuId1 ==> Id2
```

TwoHop:

```
AA.AuId1 ==> Id3 ==> Id2
```

ThreeHop:

```
AA.AuId1 ==> Id3 ==> AA.AuId4 ==> Id2(AA.AuId1可以和AA.AuId4相同)
AA.AuId1 ==> AA.AFid ==> AA.AuId4 ==> Id2(AA.AuId1可以和AA.AuId4相同)
AA.AuId1 ==> Id3 ==> F.Fid ==> Id2(Id3可以等于Id2)
AA.AuId1 ==> Id3 ==> C.Cid ==> Id2(Id3可以等于Id2)
AA.AuId1 ==> Id3 ==> J.Jid ==> Id2(Id3可以等于Id2)
AA.AuId1 ==> Id3 ==> Id4 ==> Id2 
```

### AA.AuId1, AA.AuId2

没有OneHop

TwoHop:

```
AA.AuId1 ==> Id3 ==> AA.AuId2
AA.AuId1 ==> AA.AFid ==> AA.AuId2
```

ThreeHop:

```
AA.AuId1 ==> Id3 ==> Id4 ==> AA.AuId2
```
