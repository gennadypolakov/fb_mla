const axios = require('axios');
const { Builder, By, Key, until } = require('selenium-webdriver');
// const Account = require('../utils/models');
const errorHandler = require('../utils/errorHandler');
const { fileToArray, arrayToFile, fileToObject, objectToFile, saveProfile } = require('../utils');
const { profileFile, proxyFile, statusFile } = require('../config');


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

function getProfiles() {
  return fileToObject(profileFile);
}


async function createProfile(profile) {

  if (!profile) {
    return false;
  }

  try {
    const os = ['mac', 'win'][Math.floor(Math.random() * 2)];
    let proxy = false;
    let proxyString = false;

    let profileList = fileToObject(profileFile);

    if (process.env.USE_PROXY === 'true') {
      let proxyList = fileToArray(proxyFile);

      if (proxyList.length === 0) {
        console.log('proxy.txt is empty');
        return;
      }

      let numInUse = 0;

      let next = true;
      while (next && proxyList.length > 0) {

        numInUse = 0;
        for (let key in profileList) {
          if (
            profileList.hasOwnProperty(key) &&
            profileList[key].proxy &&
            profileList[key].proxy.username &&
            profileList[key].proxy.username === proxyList[0].split('|')[0].split('@')[0].split(':')[0] &&
            profileList[key].proxy.password &&
            profileList[key].proxy.password === proxyList[0].split('|')[0].split('@')[0].split(':')[1] &&
            profileList[key].proxy.host &&
            profileList[key].proxy.host === proxyList[0].split('|')[0].split('@')[1].split(':')[0]
          ) {
            ++numInUse;
          }
        }

        if (numInUse < process.env.NUM_PROFILE_FOR_PROXY) {
          proxyString = proxyList[0];
          arrayToFile('proxy.txt', [
            ...proxyList.slice(1),
            proxyString
          ]);
          next = false;
        } else {
          arrayToFile('bad_proxy.txt', [
            ...fileToArray('bad_proxy.txt'),
            proxyList[0]
          ]);
          proxyList = proxyList.slice(1);
          arrayToFile(proxyFile, proxyList);
        }
      }

      const proxyPattern = /^[^:]+:[^:@]+@[^:@]+:\d+\|{0,1}[^\|]*$/;

      if (proxyString && proxyPattern.test(proxyString)) {
        // const loginPass = proxyString.split('|')[0].split('@')[0].split(':');
        // const hostPort = proxyString.split('|')[0].split('@')[1].split(':');
        const proxyData = proxyString.split(/[@|:|\|]/)
        proxy = {
          username: proxyData[0],
          password: proxyData[1],
          host: proxyData[2],
          port: proxyData[3],
          type: proxyData[4] ? proxyData[4] : 'SOCKS'
        };
        // const proxyType = proxyString.split('|')[1];
        // proxy.type = proxyData[4] ? proxyData[4] : 'SOCKS';
        // if (hostPort[1]) {
        //   proxy.port = +hostPort[1];
        // }
      } else {
        console.log('proxy.txt is empty');
        return;
      }
    }

    if (process.env.API_URL && process.env.TOKEN) {

      if (profile.fbUser) {
        profile.name = profile.fbUser;
      } else {
        profile.name = `${Date.now()}`;
      }
      const conf = {
        url: process.env.API_URL,
        method: 'POST',
        params: {
          token: process.env.TOKEN
        },
        data: {
          name: profile.name,
          browser: 'mimic',
          os,
          navigator: { language: 'ru-RU,ru;q=0.9' },
          storage: { passwords: false }
        }
      };
      if (process.env.USE_PROXY === 'true' && proxy) {
        conf.data.network = { proxy };
      }

      return axios(conf)
        .then(response => {
          if (response.data.uuid) {
            profile.created = Date.now();
            profile.profileId = response.data.uuid;
            if (process.env.USE_PROXY === 'true' && proxy) {
              profile.proxy = proxy;
            }
          }
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      console.log('Not set API_URL or TOKEN in .env!')
    }
  } catch (e) {
    console.log(e);
  }
}


async function addProfileNotes(id) {

  const profiles = fileToObject(profileFile);

  if (!profiles[id]) {
    return false;
  }

  if (profiles[id].notes) {
    return true;
  } else {
    if (
      profiles[id].profileId
      && profiles[id].fbUser
      && profiles[id].fbPassword
    ) {
      profiles[id].notes = `${profiles[id].fbUser}, ${profiles[id].fbPassword}`;
      if (profiles[id].fbPhoto) {
        profiles[id].notes = `${profiles[id].notes}, http://5.200.52.78:33000/photo/${profiles[id].fbPhoto}`;
      }
    } else {
      return false;
    }
  }

  const conf = {
    url: `${process.env.API_URL}/${profiles[id].profileId}`,
    method: 'PUT',
    params: {
      token: process.env.TOKEN
    },
    data: {
      notes: profiles[id].notes
    }
  };

  return axios(conf)
    .then(response => {
      console.log(response.data);
      if (
        response &&
        response.data &&
        response.data.uuid &&
        response.data.uuid === id
      ) {
        saveProfile(id, profiles[id]);
        return true;
      } else {
        return false;
      }
    })
    .catch((e) => {
      console.log(e);
      return false;
    });
}


async function updateProfileName(id) {

  let profiles = fileToObject(profileFile);

  if (!profiles[id]) {
    return false;
  }

  let newName;
  if (profiles[id].profileId && profiles[id].fbUser) {
    if (profiles[id].checkPoint && profiles[id].checkPoint === 'banned') {
      newName = `${profiles[id].fbUser}_BANNED`;
    } else if (
      profiles[id].created &&
      profiles[id].days &&
      (+profiles[id].created + +profiles[id].days * 24 * 60 * 60 * 1000) < Date.now()
    ) {
      newName = `${profiles[id].fbUser}_EXPIRED`;
    }
  } else {
    return false;
  }

  if (newName) {
    const conf = {
      url: `${process.env.API_URL}/${profiles[id].profileId}`,
      method: 'PUT',
      params: {
        token: process.env.TOKEN
      },
      data: {
        name: newName
      }
    };

    return axios(conf)
      .then(response => {
        console.log(response.data);
        if (
          response &&
          response.data &&
          response.data.uuid &&
          response.data.uuid === profiles[id].profileId
        ) {
          try {
            profiles = fileToObject(profileFile);
            delete profiles[id];
            objectToFile(profileFile, profiles);
          } catch(e){}
          return true;
        } else {
          return false;
        }
      })
      .catch((e) => {
        console.log(e);
        return false;
      });
  }
}


async function shareProfile(id, user, ws) {

  const profiles = fileToObject(profileFile);

  if (
    profiles[id] &&
    profiles[id].profileId &&
    !profiles[id].shared &&
    process.env.LOCAL_API_BASE_HOST &&
    process.env.LOCAL_API_BASE_PATH &&
    process.env.MLA_PORT
  ) {
    const conf = {
      url: `${process.env.LOCAL_API_BASE_HOST}:${process.env.MLA_PORT}${process.env.LOCAL_API_BASE_PATH}/share`,
      method: 'GET',
      params: {
        profileId: profiles[id].profileId,
        user
      }
    };
    return axios(conf)
      .then(response => {
        console.log(response);
        if (response && response.data) {
          console.log(response.data);
          saveProfile(id, { shared: user });
          try{
            ws.send(JSON.stringify({ action: 'shareProfiles', profiles: fileToObject(profileFile) }));
          } catch (e) {
            console.log(e);
          }
        } else {
          setTimeout(() => shareProfile(id, user, ws), 60 * 1000);
        }
      })
      .catch((e) => {
        console.log(e);
        setTimeout(() => shareProfile(id, user, ws), 60 * 1000);
      });
  }
}


async function shareProfiles(ids, user, ws) {

  if (ids && ids.length) {

      ids.forEach((id) => {
        addProfileNotes(id)
          .then((added) => {
            if (added) {
              shareProfile(id, user, ws);
            } else {
              const currentIds = getCurentIds();
              if (currentIds) {
                shareProfiles(currentIds, user, ws);
              }
            }
          })
          .catch((e) => {
            const currentIds = getCurentIds();
            if (currentIds) {
              shareProfiles(currentIds, user, ws);
            }
          });
      });
  }
}

function getCurentIds() {
  let statuses = fileToObject(statusFile);
  const profiles = fileToObject(profileFile);
  let tmp = [];
  if (statuses.sharingInProgress && statuses.sharingInProgress.length) {
    statuses.sharingInProgress.forEach((id) => {
      if (profiles[id] && !profiles[id].shared) {
        tmp = [...tmp, id];
      }
    });
    if (tmp.length) {
      statuses.sharingInProgress = [...tmp];
    } else {
      statuses.sharingInProgress = null;
    }
    objectToFile(statusFile, statuses);
  }
  return statuses.sharingInProgress;
}


async function createProfiles(numProfiles) {
  let createdNumProfiles = 0;
  try {
    if (typeof +numProfiles === 'number') {
      for (i = 0; i < numProfiles; i++) {
        await createProfile()
          .then((response) => {
            if (response.profileId) {
              createdNumProfiles++;
            }
          })
      }
    }
    return {
      status: 'ok',
      profiles: getProfiles(),
      createdNumProfiles
    };
  } catch (e) {
    console.log(e.message);
  }
}

async function startProfile(profile) {

  if (!profile) {
    return false;
  }
  if (!profile.profileId) {
    await createProfile(profile);
  }

  if (
    profile.profileId &&
    process.env.LOCAL_API_BASE_HOST &&
    process.env.LOCAL_API_BASE_PATH &&
    process.env.MLA_PORT
  ) {

    const conf = {
      url: `${process.env.LOCAL_API_BASE_HOST}:${process.env.MLA_PORT}${process.env.LOCAL_API_BASE_PATH}/start`,
      method: 'GET',
      params: {
        profileId: profile.profileId,
        automation: true
      }
    };
    return axios(conf)
      .then(response => {
        if (response && response.data && response.data.value) {
          profile.url = response.data.value;
          return true;
        } else {
          return false;
        }
      })
      .catch(() => false);
  } else {
    return false;
  }
}

async function stopProfile(profile) {

  if (
    profile &&
    profile.profileId &&
    process.env.LOCAL_API_BASE_HOST &&
    process.env.LOCAL_API_BASE_PATH &&
    process.env.MLA_PORT
  ) {

    const conf = {
      url: `${process.env.LOCAL_API_BASE_HOST}:${process.env.MLA_PORT}${process.env.LOCAL_API_BASE_PATH}/stop`,
      method: 'GET',
      params: {
        profileId: profile.profileId
      }
    };
    return axios(conf)
      .then(response => {
        if (response.data.status && response.data.status === 'OK') {
          return true;
        } else {
          return false;
        }
      })
      .catch(() => false);
  } else {
    return false;
  }
}

async function isProfileActive(profile) {

  if (
    profile.profileId &&
    process.env.LOCAL_API_BASE_HOST &&
    process.env.LOCAL_API_BASE_PATH &&
    process.env.MLA_PORT
  ) {

    const conf = {
      url: `${process.env.LOCAL_API_BASE_HOST}:${process.env.MLA_PORT}${process.env.LOCAL_API_BASE_PATH}/active`,
      method: 'GET',
      params: {
        profileId: profile.profileId
      }
    };
    return axios(conf)
      .then(response => {
        return response.data.value;
      })
      .catch(() => false);
  } else {
    return false;
  }
}


module.exports = { getProfiles, createProfile, createProfiles, startProfile, stopProfile, isProfileActive, updateProfileName, shareProfiles, addProfileNotes };
