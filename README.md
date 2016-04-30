# MAG-QUERIER

This [restify.js](http://restify.com/) demo if for the msra competiton.

## usage
```javascript
npm restify
npm monogojs
node main.js
```

Then simply turn on the browser and goto <http://localhost/8080/paths/:id1/:id2>

say <http://localhost/8080/paths/2140251881/2140251882>

## hints
- `lib/client.js` creates a MAG client to query from the Microsoft website for entity data;
- `lib/server.js` creates a local REST endpoint to handle to actual input pair, uses the client to query MAG. Promise is used to perform asycronous IO.

The algorithm should be implemented in server `function queryPaths(req, res, next){}`.
