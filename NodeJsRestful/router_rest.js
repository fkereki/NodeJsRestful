// Implement REST services directly, using a dispatch table to route calls


var services = {
  countries: require("./countries_service"),
  regions: require("./regions_service"),
  cities: require("./cities_service")
};


function sendResults(res, params, status, statusText, headers, result) {
  // Default values for missing parameters
  if (typeof headers === "undefined") headers = {};
  if (typeof result === "undefined") result = {};

  // Send out JSON result; don't keep connection alive
  headers["Connection"] = "close";
  headers["Content-Type"] = "application/json";
  res.writeHead(status, statusText, headers);

  // Send out JSONP if "callback" parameter was given; else, just JSON
  if (typeof params["callback"] !== "undefined")
    res.end(params["callback"] + "(" + JSON.stringify(result) + ");");
  else
    res.end(JSON.stringify(result));
};


function routeCall(req, res, body) {
  // Get parameters, both from the URL and the request body
  var urlObj = require("url").parse(req.url, true);
  var params = urlObj.query;
  var bodyParams = require("querystring").parse(body);
  for (var p in bodyParams)
    params[p] = bodyParams[p];

  // Provide path components to extract parameters from it
  params["path"] = urlObj.pathname.split("/");

  // If present, a "_method" parameter overrides the HTTP method
  if (typeof params._method === "undefined")
    params._method = req.method;

  // Analyze the URL to decide what service to call
  var toCall = urlObj.pathname.split("/")[1];

  if (typeof services[toCall] === "undefined")
    return sendResults(res, params, 404, "SERVICE NOT FOUND");

  if (typeof services[toCall]["dispatch"][params._method] === "undefined")
    return sendResults(res, params, 400, "WRONG METHOD " + params._method);

  // Dispatch call!
  return services[toCall]["dispatch"][params._method](params,
    function(status, statusText, headers, result){
      sendResults(res, params, status, statusText, headers, result);
    });
}

// Unexpected error catching

process.on('uncaughtException', function(err) {
  console.error("UNCAUGHT EXCEPTION...");
  console.error(err);
  console.error(err.stack);
});


require("http").createServer(function (req, res) {
  //  For PUT/POST methods, wait until the
  //  complete request body has been read.
  if (req.method==="POST" || req.method==="PUT") {
    var body = "";
    req.on("data", function(data){
      body += data;
    })

    req.on("end", function(){
      return routeCall(req, res, body);
    })

  } else {
    return routeCall(req, res, "");
  }
}).listen(8888);
