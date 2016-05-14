var restifyClients = require('restify-clients');

var Utils = (function () {
  /**
   * query Id but actually AuId
   * @param  {Object} obj
   * @return true if not an Id
   */
  isNotId = function(obj) {
    return (!obj.entities[0].AA);
  }

  return {
    isNotId: isNotId,
  }
}());

function MagClient() {
  this.url = 'https://oxfordhk.azure-api.net';
  this.client = restifyClients.createClient({
    name: 'MagClient',
    type: 'json',
    url: this.url,
  });
}

MagClient.prototype.getCId = function (id, cb) {
  attrStr = '&count=10000&attributes=Id,RId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Composite(C.CId=' + id.toString() + ')'
    + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
}

MagClient.prototype.getJId = function (id, cb) {
  attrStr = '&count=10000&attributes=Id,RId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Composite(J.JId=' + id.toString() + ')'
    + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
}

MagClient.prototype.getFId = function (id, cb) {
  attrStr = '&count=10000&attributes=Id,RId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Composite(F.FId=' + id.toString() + ')'
    + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
}

MagClient.prototype.getAuId = function (id, cb) {
  attrStr = '&count=10000&attributes=Id,RId,AA.AuId,AA.AfId,F.FId,J.JId,C.CId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Composite(AA.AuId=' + id.toString() + ')'
    + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
}

MagClient.prototype.getId = function (id, cb) {
  attrStr = '&count=10000&attributes=Id,RId,AA.AuId,AA.AfId,F.FId,J.JId,C.CId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Id=' + id.toString()
    + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
}

MagClient.prototype.getIdOrAuId = function (id, cb) {
  self = this;
  this.getId(id, function(err, obj) {
    if (!err) {
      // Is it an Id?
      if (Utils.isNotId(obj)) {
        // Defaults to be AuId
        self.getAuId(id, function(err, obj) {
          if (!err) {
            obj.isId = false;
            cb(null, obj);
          } else {
            cb(err);
          }
        });
      } else {
        // Now it is an Id
        obj.isId = true;
        cb(null, obj);
      }
    } else {
      cb(err);
    }
  });
}

///--- API

module.exports = {
  createClient: function createClient() {
    return (new MagClient());
  }
}
