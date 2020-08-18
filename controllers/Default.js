'use strict';

var utils = require('../utils/writer.js');
var Default = require('../service/DefaultService');

module.exports.create = function create (req, res, next) {
  var token = req.swagger.params['token'].value;
  var body = req.swagger.params['body'].value;
  var defaultMode = req.swagger.params['defaultMode'].value;
  var screenWidthMin = req.swagger.params['screenWidthMin'].value;
  var screenWidthMax = req.swagger.params['screenWidthMax'].value;
  var screenHeightMin = req.swagger.params['screenHeightMin'].value;
  var screenHeightMax = req.swagger.params['screenHeightMax'].value;
  var browserVersionMin = req.swagger.params['browserVersionMin'].value;
  var browserVersionMax = req.swagger.params['browserVersionMax'].value;
  Default.create(token,body,defaultMode,screenWidthMin,screenWidthMax,screenHeightMin,screenHeightMax,browserVersionMin,browserVersionMax)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
