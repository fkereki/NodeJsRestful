var aux = require('./auxiliar.js');

var getCountries = function(params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  var countryNameLike = aux.getParameter(params, "countrynamelike");

  return aux.conn.query("SELECT * FROM countries WHERE "
    + aux.isIn("countryCode", countryCode) + " AND "
    + aux.isLike("countryName", countryNameLike)
    + " ORDER BY countryName",
    function (err, rows) {
      if (err)
        return aux.onError(err, callback);

      var pending = rows.length;
      if (pending == 0)
        return callback(404, "NOT FOUND");

      var result = [];
      for (var i in rows) {
        result[i] = {
          code: rows[i]["countryCode"],
          name: rows[i]["countryName"],
          link: aux.countryURI(rows[i]["countryCode"]) ,
          regions: []
        };

        aux.conn.query("SELECT * FROM regions WHERE "
          + aux.isEqual("countryCode", rows[i]["countryCode"])
          + " ORDER BY regionName" ,
          (function(i) {
            return function(err, regionRows){
              if (err)
                return aux.onError(err, callback);

              for (var j in regionRows)
                result[i]["regions"][j] = {
                  name: regionRows[j]["regionName"],
                  link: aux.regionURI(rows[i]["countryCode"],
                    regionRows[j]["regionCode"])
                };

              if (--pending == 0)
                return callback(200, "OK", {}, result);

              return 0;
            };
          })(i));
      }
      return 0;
    });
};


var deleteCountries = function(params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  if (!(countryCode))
    return callback(400, "MUST SPECIFY A COUNTRY; CANNOT DELETE ALL");

  return aux.conn.query("SELECT 1 FROM regions WHERE "
    + aux.isIn("countryCode", countryCode)
    + " LIMIT 1 ",
    function (err, rows) {
      if (err)
        return aux.onError(err, callback);

      if (rows.length)
        return callback(403, "CANNOT DELETE COUNTRIES WITH REGIONS");
      else
        return aux.conn.query("DELETE FROM countries WHERE "
          + aux.isIn("countryCode", countryCode),
          function (err, result) {
            if (result.affectedRows)
              return callback(204, "DELETED");
            else
              return callback(404, "NOT FOUND");
          });
    });
};


var putOrPostCountries = function (params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  var countryName = aux.getParameter(params, "countryname");

  if (!countryCode && params._method==="POST")
    return callback(405, "MUST SPECIFY COUNTRY CODE", {
      "Allowed": "GET, PUT, DELETE"
    });

  if (!countryCode)
    return callback(403, "MUST SPECIFY COUNTRY CODE");

  if (!countryName)
    return callback(403, "MUST SPECIFY COUNTRY NAME");

  return aux.conn.query("INSERT INTO countries SET ?",
  {
    "countryCode":countryCode,
    "countryName":countryName
  },
  function (err) {
    if (err)
      return aux.conn.query("UPDATE countries SET ? WHERE "
        + aux.isEqual("countryCode", countryCode),
        {
          "countryName":countryName
        },
        function (err, result){
          if (err)
            return aux.onError(err, callback);

          if (result.affectedRows)
            return callback(204, "UPDATED",
            {
              "Location": aux.countryURI(countryCode)
            });
          else
            return callback(409, "COULDN'T UPDATE COUNTRY");
        });

    return callback(201, "CREATED", {
      "Location":aux.countryURI(countryCode)
    });
  });
};


exports.dispatch = {
  GET:    getCountries,
  DELETE: deleteCountries,
  PUT:    putOrPostCountries,
  POST:   putOrPostCountries
};
