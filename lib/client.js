var restify = require('restify');

///--- API

function MagClient() {
  this.url = 'https://oxfordhk.azure-api.net';
  this.client = restify.createClient({
    name: 'MagClient',
    type: 'json',
    url: this.url,
  });
}

MagClient.prototype.get = function get(id, cb) {
  attrStr = '&count=10000&attributes=Id,AA.AuId,AA.AfId';
  keyStr = '&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
  this.client.get(
    '/academic/v1.0/evaluate?expr=Id=' + id.toString() + attrStr + keyStr,
    function (err, req, res, obj) {
      if (err) {
        cb(err);
      } else {
        cb(null, obj);
      }
  });
};


///--- API

module.exports = {
  createClient: function createClient() {
    return (new MagClient());
  }
};
