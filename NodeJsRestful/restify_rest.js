// Implement REST services through "restify"
// ANOTHER POSSIBILITY: "JOURNEY"


var restify = require('restify');
var server = restify.createServer();

server.get(/^\/countries\/?(.*)/, countriesWS);
server.put("^/countries", countriesWS);
server.post("^/countries", countriesWS);
server.del("^/countries", countriesWS);

server.listen(8888);

console.log("RESTIFY SERVER READY");
