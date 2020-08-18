const express = require('express');
const router = express.Router();

const { getProfiles, createProfile, createProfiles, startProfile, testProfile } = require('../controllers/profiles');
const { testAuthToken } = require('../utils');

/* GET home page. */

router.get('/:authToken', (req, res, next) => {

  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json({ profiles: getProfiles() });
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }

});

router.get('/create', (req, res, next) => {

  createProfile()
    .then(data => {
      if(data && data.status === 'ok') {
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    });

});

router.get('/create/:id', (req, res, next) => {

  createProfiles(req.params.id)
    .then(data => {
      if(data && data.status === 'ok') {
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    });

});

router.get('/start/:id', (req, res, next) => {

  startProfile(req.params.id)
    .then((data) => {
      if(data && data.profileUrl) {
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    });

});

router.get('/start', (req, res, next) => {

  startProfile()
    .then((data) => {
      if(data && data.profileUrl) {
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    });

});

router.get('/test/:id', (req, res, next) => {

  testProfile(req.params.id)
    .then((data) => {
      if(data) {
        res.json(data);
      } else {
        res.status(500).json({ status: 'Error' });
      }
    });

});

module.exports = router;
