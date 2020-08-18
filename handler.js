require('dotenv').config();
const schedule = require('node-schedule');
const { accountFile } = require('./config');
const { fileToArray } = require('./utils');

const { accountHandler, profileHandler } = require('./controllers/accounts');

schedule.scheduleJob('* * * * *', () => {
  try {
    if (fileToArray(accountFile).length) {
      accountHandler();
      console.log('accountHandler started', (new Date()).toTimeString());
    } else {
      profileHandler(true);
      console.log('profileHandler started', (new Date()).toTimeString());
    }
  } catch (e) {
    console.log(e);    
  }
});
