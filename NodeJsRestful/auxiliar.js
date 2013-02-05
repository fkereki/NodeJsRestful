// A MySQL connection for all services

exports.conn = require('mysql').createConnection({
  user:     "fkereki_user",
  password: "fkereki_pass",
  database: "world"
});

// Helper function to get parameter values, if present

exports.getParameter = function (params, name) {
  return (typeof params[name] === "undefined") ? "" : params[name];
}

// Helper functions to build SELECT conditions

exports.isEqual = function (field, value) {
  return (value) ?
    field + " = " + require('mysql').escape(value) : "true" ;
}

exports.isIn = function (field, value) {
  return (value) ? field + " IN ("
    + require('mysql').escape(value).replace(/,/g, "','") + ")" : "true" ;
}

exports.isLike = function (field, value) {
  return (value) ? field + " LIKE "
    + require('mysql').escape("%"+value+"%") : "true";
}

// Helper functions to build URIs

exports.countryURI = function (id) {
  return "http://192.168.1.200:8888/countries/" + id + "/";
}

exports.regionURI = function (idC, idR) {
  return "http://192.168.1.200:8888/regions/" + idC + "/" + idR + "/";
}

exports.cityURI = function (id) {
  return "http://192.168.1.200:8888/cities/" + id + "/";
}

// Error reporting

exports.onError = function(err, callback) {
  console.error("UNEXPECTED ERROR " + err);
  console.error("STACK", err.stack);
  return callback(500, "UNEXPECTED INTERNAL ERROR");
}