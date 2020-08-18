const express = require('express');
const router = express.Router();

const { account2profile, accountHandler, currentStatus } = require('../controllers/accounts');
const { testAuthToken } = require('../utils');

// if (testAuthToken(req.params.authToken)) {
//   res.json({ profiles: getProfiles() });
// } else {
//   res.status(500).json({ error: 'Invalid auth token' });
// }

router.post('/to/profiles', (req, res) => {

  if(req.body && req.body.authToken && testAuthToken(req.body.authToken)){

    account2profile(req.body)
      .then((data) => {
        if(data && data.status && data.status === 'ok'){
          res.json(data);
        } else {
          res.status(500).json(data);
        }
      })
      .catch((e) => {
        res.status(500).json(e);
      });
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }

});


router.post('/start-handling', (req, res) => {
  if(req.body && req.body.authToken && testAuthToken(req.body.authToken)) {
    res.json(accountHandler(req.body, true));
  }
});


router.get('/status/:authToken', (req, res) => {
  if (req.params.authToken && testAuthToken(req.params.authToken)) {
    res.json(currentStatus());
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});


router.get('/login', (req, res) => {
  login()
    .then((data) => {
      if(data && data.status && data.status === 'ok'){
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    })
    .catch((e) => {
      res.status(500).json(e);
    });
});

router.get('/login/:id', (req, res) => {
  login(req.params.id)
    .then((data) => {
      if(data && data.status && data.status === 'ok'){
        res.json(data);
      } else {
        res.status(500).json(data);
      }
    })
    .catch((e) => {
      res.status(500).json(e);
    });
});

router.get('/scroll', (req, res, next) => {
  testScroll()
    .then(() => {
      res.json({ status: 'OK' })
    });
});

router.get('/frame', (req, res, next) => {
  testFrame()
    .then((data) => {
      res.json(data);
    });
});

module.exports = router;
