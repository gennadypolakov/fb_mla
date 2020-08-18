'use strict';

require('dotenv').config();
const  fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
// const mongoose = require('mongoose');

let error = false;

const app = express();

// mongoose.Promise = global.Promise;
// if(process.env.DATABASE){
//   mongoose.connect(process.env.DATABASE, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//   })
//     .then(() => console.log('MongoDB connected!'))
//     .catch(error => console.log(error));
// } else {
//   error = true;
//   console.log('Not set data base in .env file')
// }


const swaggerTools = require('swagger-tools');
const jsyaml = require('js-yaml');

// swaggerRouter configuration
var options = {
  swaggerUi: path.join(__dirname, '/swagger.json'),
  controllers: path.join(__dirname, './controllers'),
  useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(path.join(__dirname,'api/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {

  // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
  app.use(middleware.swaggerMetadata());

  // Validate Swagger requests
  app.use(middleware.swaggerValidator());

  // Route validated requests to appropriate controller
  app.use(middleware.swaggerRouter(options));

  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi());

});

// Start the server
if(!error) {
  const serverPort = process.env.PORT || 30000;
  http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
  });
}
