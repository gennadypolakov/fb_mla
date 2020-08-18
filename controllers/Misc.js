'use strict';

var utils = require('../utils/writer.js');
var Misc = require('../service/MiscService');

module.exports.activeGet = function activeGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  Misc.activeGet(profileId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.byProfileIDGet = function byProfileIDGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  Misc.byProfileIDGet(profileId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.cookiesImportNetscapeGet = function cookiesImportNetscapeGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  var contentType = req.swagger.params['Content-Type'].value;
  var body = req.swagger.params['body'].value;
  Misc.cookiesImportNetscapeGet(profileId,contentType,body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.cookiesImportWebextGet = function cookiesImportWebextGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  var contentType = req.swagger.params['Content-Type'].value;
  var body = req.swagger.params['body'].value;
  Misc.cookiesImportWebextGet(profileId,contentType,body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.shareGet = function shareGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  var user = req.swagger.params['user'].value;
  Misc.shareGet(profileId,user)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.startGet = function startGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  Misc.startGet(profileId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.stopGet = function stopGet (req, res, next) {
  var profileId = req.swagger.params['profileId'].value;
  Misc.stopGet(profileId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
