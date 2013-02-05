var aux = require('./auxiliar.js');

var getCities = function(params, callback) {
  var cityCode = aux.getParameter(params["path"], 2);
  var cityNameLike = aux.getParameter(params, "citynamelike");

  return aux.conn.query("SELECT * FROM cities WHERE "
    + aux.isIn("cityCode", cityCode) + " AND "
    + aux.isLike("cityName", cityNameLike)
    + " ORDER BY cityName, cityCode",
    function (err, rows) {
      if (err)
        return aux.onError(err, callback);

      if (rows.length == 0)
        return callback(404, "NOT FOUND");

      var result = [];
      for (var i in rows){
        result[i] = {
          code: rows[i]["cityCode"],
          name: rows[i]["cityName"],
          accentedName: rows[i]["accentedName"],
          link: aux.cityURI(rows[i]["cityCode"]),
          country: aux.countryURI(rows[i]["countryCode"]),
          region: aux.regionURI(rows[i]["countryCode"],
            rows[i]["regionCode"])
        }

        if (rows[i]["population"])
          result[i]["pop"] = rows[i]["population"];

        if (rows[i]["latitude"] || rows[i]["longitude"] )
          result[i]["coords"] = {
            lat:rows[i]["latitude"],
            lon:rows[i]["longitude"]
          };
      }

      return callback(200, "OK", {}, result);
    });
};


var deleteCities = function(params, callback) {
  var cityCode = aux.getParameter(params["path"], 2);
  if (!(cityCode))
    return callback(400, "MUST SPECIFY A CITY; CANNOT DELETE ALL");

  return aux.conn.query("DELETE FROM cities WHERE "
    + aux.isIn("cityCode", cityCode),
    function (err, result) {
      if (err)
        return aux.onError(err, callback);

      if (result.affectedRows)
        return callback(204, "DELETED");
      else
        return callback(404, "NOT FOUND");
    });
}


var putOrPostCities = function (params, callback) {
  var cityCode = aux.getParameter(params["path"], 2);
  var countryCode = aux.getParameter(params, "countrycode");
  var regionCode = aux.getParameter(params, "regioncode");
  var cityName = aux.getParameter(params, "cityName");
  var accentedName = aux.getParameter(params, "cityAccentedName");
  var population = aux.getParameter(params, "population");
  var latitude = aux.getParameter(params, "latitude");
  var longitude = aux.getParameter(params, "longitude");

  if (!countryCode)
    return callback(403, "MUST SPECIFY COUNTRY CODE");

  if (!regionCode)
    return callback(403, "MUST SPECIFY REGION CODE");

  if (!cityName)
    return callback(403, "MUST SPECIFY CITY NAME");

  if (!accentedName)
    return callback(403, "MUST SPECIFY CITY ACCENTED NAME");

  if (!latitude && !longitude)
    return callback(403, "MUST SPECIFY LATITUDE AND LONGITUDE");

  return aux.conn.query("SELECT 1 FROM regions WHERE "
    + aux.isEqual("countryCode", countryCode) + " AND "
    + aux.isEqual("regionCode", regionCode),
    function (err, rows){
      if (err)
        return aux.onError(err, callback);

      if (rows.length == 0)
        return callback(403, "REGION MUST EXIST");

      if (!cityCode) // cityCode not given; do an INSERT
        return aux.conn.query("INSERT INTO cities SET ?",
        {
          "countryCode": countryCode,
          "regionCode": regionCode,
          "cityName": cityName,
          "cityAccentedName": accentedName,
          "population": population,
          "latitude": latitude,
          "longitude": longitude
        },
        function(err, result) {
          if (result.affectedRows)
            return callback(201, "CREATED", {
              "Location": aux.cityURI(result.insertId)
            });
          else
            return callback(409, "COULDN'T ADD CITY");
        });

      else // cityCode was given; can be INSERT or UPDATE
        return aux.conn.query("INSERT IGNORE INTO cities SET ?",
        {
          "cityCode": cityCode,
          "countryCode": countryCode,
          "regionCode": regionCode,
          "cityName": cityName,
          "cityAccentedName": accentedName,
          "population": population,
          "latitude": latitude,
          "longitude": longitude
        },
        function(err, result) {
          if (err)
            return aux.conn.query("UPDATE cities SET ? WHERE "
              + aux.isEqual("cityCode", cityCode),
              {
                "countryCode": countryCode,
                "regionCode": regionCode,
                "cityName": cityName,
                "cityAccentedName": accentedName,
                "population": population,
                "latitude": latitude,
                "longitude": longitude
              },
              function(err, result) {
                if (err)
                  return aux.onError(err, callback);

                if (result.affectedRows)
                  return callback(204, "UPDATED", {
                    "Location": aux.cityURI(cityCode)
                  });
                else
                  return callback(409, "COULDN'T UPDATE CITY");
              });

          return callback(201, "CREATED", {
            "Location":aux.cityURI(cityCode)
          });
        });
    });
};


exports.dispatch = {
  GET:    getCities,
  DELETE: deleteCities,
  PUT:    putOrPostCities,
  POST:   putOrPostCities
};
