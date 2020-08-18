const path = require('path');
const express = require('express');
const router = express.Router();
const { errorLogFile } = require('../config');
const { fileToObject, testAuthToken } = require('../utils');

router.get('/get/:authToken', (req, res) => {
  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json(fileToObject(errorLogFile));
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});

router.get('/', (req, res) => {
  // res.render('index', { title: 'Express' });
  res.sendFile(path.resolve('public/index.html'));

});

module.exports = router;
