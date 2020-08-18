const path = require('path');
const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('*', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

module.exports = router;
