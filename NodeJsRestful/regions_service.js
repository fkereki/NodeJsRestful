var aux = require('./auxiliar.js');

var getRegions = function(params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  var regionCode = aux.getParameter(params["path"], 3);
  var regionNameLike = aux.getParameter(params, "regionnamelike");

  return aux.conn.query("SELECT rr.*, cc.countryName FROM regions rr"
    + " JOIN countries cc ON cc.countryCode=rr.countryCode WHERE "
    + aux.isIn("rr.countryCode", countryCode) + " AND "
    + aux.isIn("regionCode", regionCode) + " AND "
    + aux.isLike("regionName", regionNameLike),
    function (err, rows) {
      if (err)
        return aux.onError(err, callback);

      var pending = rows.length;
      if (pending == 0)
        return callback(404, "NOT FOUND");

      var result = [];
      for (var i in rows) {
        result[i] = {
          code: rows[i]["regionCode"],
          name: rows[i]["regionName"],
          link: aux.regionURI(rows[i]["countryCode"],
            rows[i]["regionCode"]),
          country: {
            code: rows[i]["countryCode"],
            name: rows[i]["countryName"],
            link: aux.countryURI(rows[i]["countryCode"])
          },
          cities:[]
        };

        aux.conn.query("SELECT * FROM cities WHERE "
          + aux.isEqual("countryCode", rows[i]["countryCode"]) + " AND "
          + aux.isEqual("regionCode", rows[i]["regionCode"])
          + " ORDER BY cityName",
          (function(i) {
            return function(err, cityRows){
              if (err)
                return aux.onError(err, callback);

              for (var j in cityRows)
                result[i]["cities"][j] = {
                  name: cityRows[j]["cityName"],
                  link: aux.cityURI(cityRows[j]["cityCode"])
                };

              if (--pending == 0)
                return callback(200, "OK", {}, result);
              else
                return 0;
            };
          })(i));
      }

      return 0;
    });
};


var deleteRegions = function(params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  var regionCode = aux.getParameter(params["path"], 3);

  if (!(countryCode))
    return callback(400, "MUST SPECIFY A COUNTRY; CANNOT DELETE ALL");

  return aux.conn.query("SELECT 1 FROM cities WHERE "
    + aux.isIn("countryCode", countryCode) + " AND "
    + aux.isIn("regionCode", regionCode)
    + " LIMIT 1 ",
    function (err, rows) {
      if (err)
        return aux.onError(err, callback);

      if (rows.length)
        return callback(403, "CANNOT DELETE REGIONS WITH CITIES");
      else
        return aux.conn.query("DELETE FROM regions WHERE "
          + aux.isIn("countryCode", countryCode) + " AND "
          + aux.isIn("regionCode", regionCode),
          function (err, result) {
            if (result.affectedRows)
              return callback(204, "DELETED");
            else
              return callback(404, "NOT FOUND");
          });
    });
};


var putOrPostRegions = function (params, callback) {
  var countryCode = aux.getParameter(params["path"], 2);
  var regionCode = aux.getParameter(params["path"], 3);
  var regionName = aux.getParameter(params, "regionname");

  if (!countryCode && params._method==="POST")
    return callback(405, "MUST SPECIFY COUNTRY CODE", {
      "Allowed": "GET, PUT, DELETE"
    });

  if (!regionCode && params._method==="POST")
    return callback(405, "MUST SPECIFY REGION CODE", {
      "Allowed": "GET, PUT, DELETE"
    });

  if (!countryCode)
    return callback(403, "MUST SPECIFY COUNTRY CODE");

  if (!regionCode)
    return callback(403, "MUST SPECIFY REGION CODE");

  if (!regionName)
    return callback(403, "MUST SPECIFY REGION NAME");

  return aux.conn.query("SELECT 1 FROM countries WHERE "
    + aux.isEqual("countryCode", countryCode),
    function(err, rows) {
      if (err)
        return aux.onError(err, callback);

      if (rows.length == 0)
        return callback(403, "MUST SPECIFY VALID COUNTRY CODE");

      return aux.conn.query("INSERT INTO regions SET ?",
      {
        "countryCode":countryCode,
        "regionCode":regionCode,
        "regionName":regionName
      },
      function (err) {
        if (err)
          return aux.conn.query("UPDATE regions "
            + "SET regionName=? WHERE "
            + aux.isEqual(rows[i]["countryCode"]) + " AND "
            + aux.isEqual(rows[i]["regionCode"]),
            [regionName, countryCode, regionCode],
            function (err, result){
              if (err)
                return aux.onError(err, callback);

              if (result.affectedRows)
                return callback(204, "UPDATED", {
                  "Location": aux.regionURI(countryCode, regionCode)
                });
              else
                return callback(409, "COULDN'T UPDATE REGION");
            });

        return callback(201, "CREATED", {
          "Location": aux.regionURI(countryCode, regionCode)
        });
      });
    })
};


exports.dispatch = {
  GET:    getRegions,
  DELETE: deleteRegions,
  PUT:    putOrPostRegions,
  POST:   putOrPostRegions
};
