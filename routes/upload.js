const path = require('path');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'data/uploads/' });

const { dataHandler } = require('../controllers/uploads');
const { testAuthToken } = require('../utils');
/* GET home page. */


router.post('/:type', upload.array('files'), (req, res, next) => {
  if(req.body && req.body.authToken && testAuthToken(req.body.authToken)){
    if (
      req.files && req.files.length &&
      (req.params.type === 'proxy' || req.params.type === 'accounts')
    ) {
      res.json(dataHandler(req.files, req.params.type));
    } else {
      res.status(500).json({ status: 'error' });
    }
  } else {
    res.status(500).json({ error: 'Invalid auth token' });
  }
});

router.get('/', (req, res) => {
  // res.render('index', { title: 'Express' });
  res.sendFile(path.resolve('public/index.html'));

});

module.exports = router;
