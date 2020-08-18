const path = require('path');
const express = require('express');
const router = express.Router();
const md5 = require('md5');

const multer = require('multer');
const upload = multer({ dest: 'data/uploads/' });

const { errorLogFile, password, profileFile } = require('../config');
const { fileToObject, testAuthToken } = require('../utils');
const { accountHandler, currentStatus } = require('../controllers/accounts');
const { addProfileNotes, shareProfile } = require('../controllers/profiles');
const { dataHandler } = require('../controllers/uploads');


router.post('/upload/:type', upload.array('files'), (req, res) => {
  if (req.body && req.body.authToken && testAuthToken(req.body.authToken)) {
    if (
      req.files && req.files.length &&
      (req.params.type === 'proxy' || req.params.type === 'accounts')
    ) {
      let proxyType = false;
      if (req.body.type) {
        proxyType = req.body.type;
      }
      res.json(dataHandler(req.files, req.params.type, proxyType));
    } else {
      res.status(500).json({ status: 'error' });
    }
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});



router.get('/profiles/:authToken', (req, res) => {

  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json({ profiles: fileToObject(profileFile) });
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }

});


router.post('/profiles/share', (req, res) => {
  if (req.body && req.body.authToken && testAuthToken(req.body.authToken)) {
    if (
      req.files && req.files.length &&
      (req.params.type === 'proxy' || req.params.type === 'accounts')
    ) {
      let proxyType = false;
      if (req.body.type) {
        proxyType = req.body.type;
      }
      res.json(dataHandler(req.files, req.params.type, proxyType));
    } else {
      res.status(500).json({ status: 'error' });
    }
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});


router.get('/profiles/test/test', (req, res) => {

  console.log('/profiles/test');

  shareProfile('195', 'autofarm@protonmail.com');
  res.json('ok');


  // addProfileNote('test note to profile 2')
  //   .then((response) => {
  //     res.json(response.data);
  //   })
  //   .catch((e) => {
  //     res.status(500).json(e);
  //     console.log(e);
  //   });

  // if (req.params.authToken && testAuthToken(req.params.authToken)) {
  //   res.json({ profiles: fileToObject(profileFile) });
  // } else {
  //   res.status(500).json({ error: 'Invalid auth token' });
  // }

});



router.post('/accounts/start-handling', (req, res) => {
  if (req.body && req.body.authToken && testAuthToken(req.body.authToken)) {
    const initData = req.body;
    delete initData.authToken;
    res.json(accountHandler(initData, true));
  }
});


router.get('/accounts/status/:authToken', (req, res) => {
  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json(currentStatus());
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});


router.get('/errors/:authToken', (req, res) => {
  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json(fileToObject(errorLogFile));
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});


router.post('/login', (req, res) => {
  console.log(req.body.password, password)
  if (req.body.password === password) {
    res.json({
      status: 'ok',
      authToken: md5(password)
    });
  } else {
    res.status(500).json({ status: 'error' });
  }
});


module.exports = router;
