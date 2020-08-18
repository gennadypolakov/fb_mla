const path = require('path');
const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.sendFile(path.resolve('public/test.html'));
});

module.exports = router;
