# MAG-QUERIER

This [restify.js](http://restify.com/) demo is for the [msra competiton](https://studentclub.msra.cn/bop2016/topic/).

## usage
```javascript
npm i
npm start
```

Then simply turn on the browser and goto <http://localhost/8080/paths?id1=:id1&id2=:id2>

### Test cases

- <http://localhost:8080/paths?id1=1982152022&id2=2147152072> Id Id，Case 1;
- <http://localhost:8080/paths?id1=2140251882&id2=2134693834> Id AuId, Case 2;
- <http://localhost:8080/paths?id1=2125800575&id2=2140251882> AuId Id, Case 3;
- <http://localhost:8080/paths?id1=2124455071&id2=2307349597> AuId AuId, Case 4.

## hints
- `lib/client.js` creates a MAG client to query from the Microsoft website for entity data;
- `lib/server.js` creates a local REST endpoint to handle to actual input pair, uses the client to query MAG. Promise is used to perform asycronous IO.

# Possible Connections

## By request
### Id1, Id2
OneHop:

```
Id1 ==> Id2
```

TwoHop:

```
Id1 ==> F.Fid ==> Id2
Id1 ==> C.Cid ==> Id2
Id1 ==> J.Jid ==> Id2
Id1 ==> AA.AuId ==> Id2
Id1 ==> Id3 ==> Id2
```

ThreeHop: 

```
Id1 ==> F.Fid ==> Id3 ==> Id2
Id1 ==> C.Cid ==> Id3 ==> Id2
Id1 ==> J.Jid ==> Id3 ==> Id2
Id1 ==> AA.AuId ==> Id3 ==> Id2
Id1 ==> Id3 ==> F.Fid ==> Id2
Id1 ==> Id3 ==> C.Cid ==> Id2
Id1 ==> Id3 ==> J.Jid ==> Id2
Id1 ==> Id3 ==> AA.AuId ==> Id2
Id1 ==> Id3 ==> Id4 ==> Id2
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
Id1 ==> F.Fid ==> Id3 ==> AA.AuId2
Id1 ==> C.Cid ==> Id3 ==> AA.AuId2
Id1 ==> J.Jid ==> Id3 ==> AA.AuId2
Id1 ==> AA.AuId3 ==> Id4 ==> AA.AuId2
Id1 ==> AA.AuId3 ==> AA.AFid ==> AA.AuId2
Id1 ==> Id3 ==> Id4 ==> AA.AuId2
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
AA.AuId1 ==> Id3 ==> AA.AuId4 ==> Id2
AA.AuId1 ==> AA.AFid ==> AA.AuId4 ==> Id2
AA.AuId1 ==> Id3 ==> F.Fid ==> Id2
AA.AuId1 ==> Id3 ==> C.Cid ==> Id2
AA.AuId1 ==> Id3 ==> J.Jid ==> Id2
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
