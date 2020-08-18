const { createWriteStream, existsSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');
const axios = require('axios');
const errorHandler = require('./errorHandler');
const { password } = require('../config');
const md5 = require('md5');
const { accountFile, configFile, profileFile, profileIdsFile, statusFile } = require('../config');

function testAuthToken(authToken) {
  return authToken === md5(password);
}


function fileToArray(fileName) {
  let array = [];

  if (existsSync(path.join(__dirname, `../data/${fileName}`))) {
    readFileSync(path.join(__dirname, `../data/${fileName}`), 'utf8')
      .split(/\r?\n/)
      .forEach(item => {
        if (item.trim() !== '') array.push(item);
      });
  }

  return array;
}

function arrayToFile(fileName, array) {
  writeFileSync(path.join(__dirname, `../data/${fileName}`), array.join('\n'));
}


function fileToObject(fileName, data = {}) {
  if (existsSync(path.join(__dirname, `../data/${fileName}`))) {
    tempData = readFileSync(path.join(__dirname, `../data/${fileName}`), 'utf8');
    if (tempData.trim() !== '') {
      data = JSON.parse(tempData);
    }
  }
  // try {
  //   data = require(`../data/${fileName}`);
  // } catch (e) { }
  return data;
}

function objectToFile(fileName, data) {
  writeFileSync(path.join(__dirname, `../data/${fileName}`), JSON.stringify(data, null, '  '));
}

function saveProfile(id, data) {
  const profiles = fileToObject(profileFile);
  if (profiles.hasOwnProperty(id)) {
    profiles[id] = {
      ...profiles[id],
      ...data
    }
  } else {
    profiles[id] = data;
  }
  objectToFile(profileFile, profiles);
}

function getProfile(id) {
  let profile = Object.create(null);
  if (id) {
    let profiles = fileToObject(profileFile);
    if (profiles.hasOwnProperty(id)) {
      profile = profiles[id];
    }
  }
  return profile;
}


function getLastId() {
  const profiles = fileToObject(profileFile);
  const profilesIds = [];
  for (let id in profiles) {
    if (profiles.hasOwnProperty(id) && typeof +id === 'number') {
      profilesIds.push(+id);
    }
  }
  if (profilesIds.length) {
    return profilesIds.sort((a, b) => b - a)[0];
  }
  return 0;
}


async function getPhoneNumber(country = 'RU') {

  if (!process.env.SMS_API_KEY) {
    return 'Not set sms api key'
  }

  const conf = {
    url: 'http://simsms.org/priemnik.php',
    method: 'GET',
    params: {
      metod: 'get_number',
      country,
      service: 'opt2',
      apikey: process.env.SMS_API_KEY
    }
  };

  let startTime = Date.now();
  return new Promise((resolve) => {
    (function loop() {
      if (Date.now() < startTime + 30 * 1000 * 5) {
        axios(conf)
          .then((response) => {
            console.log(response.data);
            if (
              response.data.response &&
              response.data.response === '1' &&
              response.data.number &&
              response.data.id &&
              +response.data.id > 0
            ) {
              resolve({
                id: response.data.id,
                number: response.data.number
              });
            } else {
              setTimeout(() => loop(), 30000);
            }
          })
          .catch((e) => {
            console.log(e);
            resolve(false);
          });
      } else {
        resolve(false);
      }
    })();
  });

}

async function banPhoneNumber(id) {

  let status = false;
  if (!process.env.SMS_API_KEY) {
    return status;
  }

  const conf = {
    url: 'http://simsms.org/priemnik.php',
    method: 'GET',
    params: {
      metod: 'ban',
      service: 'opt2',
      apikey: process.env.SMS_API_KEY,
      id
    }
  };

  let startTime = Date.now();
  while (!phone.number && Date.now() < startTime + 10 * 1000 * 3) {
    await axios(conf)
      .then((response) => {
        if (
          response.data.response &&
          response.data.response === '1' &&
          +response.data.id === id
        ) {
          status = true;
        }
      })
      .catch(() => { });
    if (!status) {
      await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    }
  }

  return status;

}

async function getSmsCode(id, country = 'ru', sms = false) {

  if (!process.env.SMS_API_KEY) {
    return false;
  }

  let conf = {
    url: 'http://simsms.org/priemnik.php',
    method: 'GET',
    params: {
      metod: 'get_sms',
      service: 'opt2',
      apikey: process.env.SMS_API_KEY,
      id,
      country
    }
  };

  if (sms) {
    conf.sms = sms;
  }

  return new Promise((resolve) => {
    let startTime = Date.now();
    (function loop() {
      if (Date.now() < startTime + 570 * 1000) {
        axios(conf)
          .then((response) => {
            console.log('getSmsCode', response.data);
            if (
              response.data.response &&
              response.data.response === '1' &&
              response.data.sms
            ) {
              resolve(response.data.sms);
            } else {
              setTimeout(() => loop(), 25000)
            }
          })
          .catch((e) => {
            console.log(e);
            resolve(false);
          });
      } else {
        if (!sms) {
          resolve('sms');
        } else {
          resolve(false);
        }
      }
    })();
  });

}

async function createReCaptchaTask(profileId) {

  if (!profileId) {
    return false;
  }

  if (!process.env.ANTICAPTCHA_API_KEY) {
    return false;
  }

  let profile = getProfile(profileId);

  if (!profile.proxy) {
    console.log('Not set profile proxy!')
    return false;
  }

  const conf = {
    url: 'https://api.anti-captcha.com/createTask',
    method: 'POST',
    data: {
      clientKey: process.env.ANTICAPTCHA_API_KEY,
      task:
      {
        type: 'NoCaptchaTask',
        websiteURL: 'https://fbsbx.com/',
        // websiteURL: profile.captchaUrl,
        websiteKey: profile.captchaSiteKey,
        proxyType: profile.proxy.type === 'SOCKS' ? 'socks5' : 'http',
        proxyAddress: profile.proxy.host,
        proxyPort: +profile.proxy.port,
        proxyLogin: profile.proxy.username,
        proxyPassword: profile.proxy.password,
        userAgent: profile.userAgent
      }
    }
  };

  return axios(conf)
    .then((response) => {
      if (
        response &&
        response.data &&
        response.data.errorId !== undefined &&
        +response.data.errorId === 0 &&
        response.data.taskId
      ) {
        return response.data.taskId;
      } else {
        return false;
      }
    })
    .catch((e) => {
      console.log(e);
      return false;
    });

}

async function getReCaptchaTaskResult(taskId) {


  if (!taskId) {
    return false;
  }

  if (!process.env.ANTICAPTCHA_API_KEY) {
    return false;
  }

  const conf = {
    url: 'https://api.anti-captcha.com/getTaskResult',
    method: 'POST',
    data: {
      clientKey: process.env.ANTICAPTCHA_API_KEY,
      taskId
    },
  };

  return axios(conf)
    .then((response) => {
      if (response.data) {
        return response.data;
      } else {
        return false;
      }
    })
    .catch(() => {
      return false;
    });

}


async function createImageCaptchaTask(base64png) {

  console.log(base64png);

  if (!process.env.ANTICAPTCHA_API_KEY) {
    return false;
  }

  try {

    const conf = {
      url: 'https://api.anti-captcha.com/createTask',
      method: 'POST',
      data: {
        clientKey: process.env.ANTICAPTCHA_API_KEY,
        task:
        {
          type: 'ImageToTextTask',
          body: base64png,
          phrase: false,
          case: true,
          numeric: 0,
          math: false,
          minLength: 0,
          maxLength: 0
        }
      }
    };

    return axios(conf)
      .then((response) => {
        console.log(response.data);
        if (
          response.data &&
          response.data.errorId !== undefined &&
          +response.data.errorId === 0 &&
          response.data.taskId
        ) {
          return response.data.taskId;
        } else {
          return false;
        }
      })
      .catch((e) => {
        console.log(e);
        return false;
      });

  } catch (e) {
    console.log(e);
    return false;
  }

}

async function getImageCaptchaTaskResult(taskId) {


  if (!taskId) {
    return false;
  }

  if (!process.env.ANTICAPTCHA_API_KEY) {
    return false;
  }

  const conf = {
    url: 'https://api.anti-captcha.com/getTaskResult',
    method: 'POST',
    data: {
      clientKey: process.env.ANTICAPTCHA_API_KEY,
      taskId
    },
  };

  return axios(conf)
    .then((response) => {
      if (response.data) {
        return response.data;
      } else {
        return false;
      }
    })
    .catch(() => {
      return false;
    });

}


function downloadImage(url, imagePath) {
  return new Promise((resolve, reject) => {
    axios({
      url,
      responseType: 'stream',
    })
      .then(response => {
        const writer = createWriteStream(imagePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', (e) => reject(e));
      })
      .catch((e) => reject(e));
  });
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max + 1 - min)) + min;
}


module.exports = {
  arrayToFile,
  banPhoneNumber,
  createImageCaptchaTask,
  createReCaptchaTask,
  downloadImage,
  fileToArray,
  fileToObject,
  getImageCaptchaTaskResult,
  getLastId,
  getPhoneNumber,
  getProfile,
  getRandomInt,
  getReCaptchaTaskResult,
  getSmsCode,
  objectToFile,
  saveProfile,
  testAuthToken
};
