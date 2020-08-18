'use strict';


/**
 * checkProfileRunning
 * Check if profile is already running
 *
 * profileId String Browser profile ID
 * no response value expected for this operation
 **/
exports.activeGet = function(profileId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * cloneProfile
 * Clone browser profile
 *
 * profileId String Browser profile ID
 * no response value expected for this operation
 **/
exports.byProfileIDGet = function(profileId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * cookieImportNetscape
 * Import Cookies in Netscape format
 *
 * profileId String Browser profile ID
 * contentType String Cookies in text/plain format
 * body CookieNetscapeExample 
 * no response value expected for this operation
 **/
exports.cookiesImportNetscapeGet = function(profileId,contentType,body) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * cookieImportJSON
 * Import Cookies in JSON format
 *
 * profileId String Browser profile ID
 * contentType String Cookies in application/json format
 * body CookieJSONExample 
 * no response value expected for this operation
 **/
exports.cookiesImportWebextGet = function(profileId,contentType,body) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * shareProfile
 * Share browser profile
 *
 * profileId String Browser profile ID
 * user String Multilogin account (email address) to share profile with
 * no response value expected for this operation
 **/
exports.shareGet = function(profileId,user) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * startProfile
 * Launch browser profile
 *
 * profileId String Browser profile ID
 * no response value expected for this operation
 **/
exports.startGet = function(profileId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * stopProfile
 * Stop browser profile
 *
 * profileId String Browser profile ID
 * no response value expected for this operation
 **/
exports.stopGet = function(profileId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

