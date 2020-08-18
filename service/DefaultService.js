'use strict';


/**
 * createProfile
 * Create a browser profile
 *
 * token String Authentication token
 * body MlaProfile 
 * defaultMode String Default value for all masking mechanisms (optional)
 * screenWidthMin Integer Minimal screen width (optional)
 * screenWidthMax Integer Maximal screen width (optional)
 * screenHeightMin Integer Minimal screen width (optional)
 * screenHeightMax Integer Maximal screen height (optional)
 * browserVersionMin Integer Maximal browser core version (optional)
 * browserVersionMax Integer Maximal browser core version (optional)
 * no response value expected for this operation
 **/
exports.create = function(token,body,defaultMode,screenWidthMin,screenWidthMax,screenHeightMin,screenHeightMax,browserVersionMin,browserVersionMax) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

