const { fileToObject, testAuthToken } = require('../utils');
const { shareProfiles } = require('../controllers/profiles');

const wsHandler = (ws) => {
  let authToken = null;
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) { }
    if (data) {
      if (!authToken) {
        if (data.authToken && testAuthToken(data.authToken)) {
          authToken = data.authToken;
          ws.send(JSON.stringify({ authToken }));
        } else {
          ws.close();
        }
      }

      if (authToken && data.action) {
        const action = data.action;

        if (action === 'shareProfiles' && data.ids && data.user) {
          shareProfiles(data.ids, data.user, ws);
        }
      }
    }
    // console.log('received: %s', message);
    // ws.send(JSON.stringify([`Hello, you sent -> ${msg}`]));
  });
  //send immediatly a feedback to the incoming connection    
  // ws.send(JSON.stringify(['Hi there, I am a WebSocket server']));
}

module.exports = wsHandler;