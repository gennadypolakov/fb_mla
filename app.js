const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { readFileSync } = require('fs');

// const wsHandler = require('./routes/ws');
const indexRouter = require('./routes');
const apiRouter = require('./routes/api');
// const ws = require('ws');
// const testRouter = require('./routes/test');

// const mongoose = require('mongoose');

const app = express();
// require('express-ws')(app);

app.set('etag', false);

/*mongoose.Promise = global.Promise;
if(process.env.DATABASE){
  mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
  })
    .then(() => console.log('MongoDB connected!'))
    .catch(error => console.log(error));
} else {
  throw 'Not set data base in .env file';
}*/

if (process.env.NODE_ENV === 'development') {
  const swaggerTools = require('swagger-tools');
  const jsyaml = require('js-yaml');

  // swaggerRouter configuration
  const options = {
    swaggerUi: path.join(__dirname, '/swagger.json'),
    controllers: path.join(__dirname, './controllers'),
    useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
  };

  // The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
  const spec = readFileSync(path.join(__dirname, 'api/swagger.yaml'), 'utf8');
  const swaggerDoc = jsyaml.safeLoad(spec);

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
}

// const wss = new ws.Server({ port: 8800 });

// wss.on('connection', (ws) => {
//   ws.on('message', (message) => {
//     console.log(message);
//     ws.send('something');
//   });
// });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
const staticServe = express.static(path.join(__dirname, 'public'))
app.use(staticServe);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// app.use('/test', testRouter);
// app.ws('/api/ws', wsHandler);
app.use('/api', apiRouter);
app.use('*', staticServe);
app.use('/', indexRouter);

module.exports = app;
