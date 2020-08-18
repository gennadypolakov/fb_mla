const path = require('path');
let chrome = require('selenium-webdriver/chrome');
const { Builder, By, Key, until, FileDetector } = require('selenium-webdriver');
const EventEmitter = require('events');
const readline = require('readline');

const AccountHandler = require('../handlers/account-handler');

const {
  arrayToFile,
  banPhoneNumber,
  createReCaptchaTask,
  downloadImage,
  fileToArray,
  fileToObject,
  getLastId,
  getPhoneNumber,
  getProfile,
  getRandomInt,
  getReCaptchaTaskResult,
  getSmsCode,
  objectToFile,
  saveProfile,
} = require('../utils');
const { startProfile, stopProfile, isProfileActive, updateProfileName, addProfileNotes } = require('./profiles');

const { accountFile, configFile, profileFile, profileIdsFile, statusFile } = require('../config');

// const Account = require('../utils/models');

const debug = true;

async function account2profile(data) {

  const accounts = fileToArray(accountFile);
  const allProfiles = fileToObject(profileFile);

  let profile = {};

  for (let profileId in allProfiles) {
    if (allProfiles.hasOwnProperty(profileId)) {
      let addProfile = true;
      for (let prop in allProfiles[profileId]) {
        if (prop !== 'name' && prop !== 'proxy') {
          addProfile = false;
          break;
        }
      }
      if (addProfile) {
        profile[profileId] = allProfiles[profileId];
      }
    }
  }

  let numAccounts2Profiles = 0;

  if (accounts.length > 0 && Object.keys(profile).length > 0) {
    const profileIds = Object.keys(profile);
    const numIterations = accounts.length > profileIds.length ? profileIds.length : accounts.length;
    for (let i = 0; i < numIterations; i++) {
      const result = await startHandling(profileIds[i], { ...data, accountStr: accounts[i] });

      if (result.status && result.status === 'ok') {
        numAccounts2Profiles++;
      }

    }

  }

  return {
    status: 'ok',
    numAccounts2Profiles
  };
}

function accountHandler(initData = false, manually = false) {

  console.log('accountHandler');

  const accounts = fileToArray(accountFile);
  let currentStatus = fileToObject(statusFile);

  if (!initData) {
    initData = fileToObject(configFile);
  }

  if (manually) {
    currentStatus = {
      ...currentStatus,
      stopHandling: false,
      accounts: accounts.length,
      handledAccounts: 0,
      accountsInProgress: 0
    };
    objectToFile(statusFile, currentStatus);
  }

  if (
    accounts.length &&
    (currentStatus.accountsInProgress || 0) < process.env.MAX_NUM_IN_PROGRESS &&
    !currentStatus.stopHandling
  ) {

    // let j = Math.min(accounts.length, process.env.MAX_NUM_IN_PROGRESS - (currentStatus.accountsInProgress || 0));
    // for (let i = 0; i < j; i++) {

      if (currentStatus.accountsInProgress) {
        currentStatus.accountsInProgress++;
      } else {
        currentStatus.accountsInProgress = 1;
      }

      startHandling(false, initData, () => { accountHandler(initData); })
        .then(() => {
          let currentStatus = fileToObject(statusFile);
          if (currentStatus.handledAccounts) {
            currentStatus.handledAccounts++;
          } else {
            currentStatus.handledAccounts = 1;
          }
          if (currentStatus.accountsInProgress) {
            currentStatus.accountsInProgress--;
          }
          objectToFile(statusFile, currentStatus);
          accountHandler(initData);
        })
        .catch(e => console.log(e));
    // }

    objectToFile(statusFile, currentStatus);

    return {
      status: 'ok',
      ...fileToObject(statusFile)
    };
  } else {
    return {
      status: 'error',
    };
  }
}

function profileHandler(start = false) {

  let profileIds = fileToObject(profileIdsFile, []);
  let currentStatus = fileToObject(statusFile);

  if (!profileIds.length && start) {
    profileIds = Object.keys(fileToObject(profileFile));
    objectToFile(profileIdsFile, profileIds);
  }

  let initData = fileToObject(configFile);

  if (
    profileIds.length &&
    (currentStatus.accountsInProgress || 0) < process.env.MAX_NUM_IN_PROGRESS &&
    !currentStatus.stopHandling
  ) {

    if (currentStatus.accountsInProgress) {
      currentStatus.accountsInProgress++;
    } else {
      currentStatus.accountsInProgress = 1;
    }

    // setTimeout(() => {
    startHandling(profileIds[0], initData, profileHandler)
      .then(() => {
        let currentStatus = fileToObject(statusFile);
        if (currentStatus.handledAccounts) {
          currentStatus.handledAccounts++;
        } else {
          currentStatus.handledAccounts = 1;
        }
        if (currentStatus.accountsInProgress) {
          currentStatus.accountsInProgress--;
        }
        objectToFile(statusFile, currentStatus);
        profileHandler();
      })
      .catch(e => console.log(e));
    // }, timeout);
    // timeout += 10000;
    profileIds.splice(0, 1);
    // }
    objectToFile(profileIdsFile, profileIds);
    objectToFile(statusFile, currentStatus);

  }

}

function stopHandling() {
  objectToFile(statusFile, {
    ...fileToObject(statusFile),
    stopHandling: true,
    handledAccounts: undefined,
    accountsInProgress: undefined
  });
}

function currentStatus() {
  return fileToObject(statusFile);
}

class Emitter extends EventEmitter { }

async function startHandling(id = false, initData = false, startNext = false) {

  return new Promise((resolve, reject) => {

    const emitter = new Emitter();

    let driver, handler, profile;

    emitter.on('startProfile', () => {
      console.log('startProfile emitted');

      handler = new AccountHandler(id);
      handler.startProfile()
        .then(() => handler.buildDriver())
        .then(() => handler.sleep(5))
        .then(() => {
          emitter.emit('openUrl');
        })
        .catch((e) => {
          console.log(e);
          emitter.emit('exit');
        });

      // startProfile(profileId, profile)
      //   .then((data) => {
      //     if (data && data.profileUrl && data.profileId) {

      //       profile.url = data.profileUrl;
      //       profile.updated = Date.now();
      //       if(!profileId){
      //         profileId = data.profileId;
      //       }
      //       saveProfile(profileId, profile);
      //       emitter.emit('driver');
      //     } else {
      //       emitter.emit('exit');
      //     }
      //   })
      //   .catch(() => {
      //     emitter.emit('exit');
      //   });
    });

    // emitter.on('driver', () => {
    //   console.log('driver emitted');
    //   driver = new Builder()
    //     .forBrowser('chrome')
    //     .usingServer(profile.url)
    //     .build();
    //   driver.setFileDetector(new FileDetector());
    //   handler = new AccountHandler(driver, id);
    //   emitter.emit('openUrl');
    // });

    emitter.on('openUrl', () => {
      console.log('openUrl emitted');
      handler.driver.get('https://www.facebook.com/')
        .then(() => {
          handler.profile.checkPoint = undefined;
          handler.save();
          emitter.emit('testCheckPoint');
        })
        .then(() => handler.sleep(5))
        .then(() => {
          if (startNext && startNext instanceof Function) {
            startNext();
          }
        })
        .catch(() => {
          console.log('Error to open url');
          emitter.emit('exit');
        });
    });

    emitter.on('testCheckPoint', () => {
      console.log('testCheckPoint emitted');
      handler.testCheckPoint()
        .then(() => emitter.emit('isLoggedIn'))
        .catch((e) => console.log(e));
    });

    emitter.on('checkPointHandler', () => {
      console.log('checkPointHandler emitted');
      if (handler.profile.checkPoint) {
        handler.checkPointHandler()
          .then(
            () => emitter.emit('exit'),
            () => emitter.emit('exit')
          );
      } else {
        emitter.emit('exit');
      }
    });

    emitter.on('isLoggedIn', () => {
      console.log('isLoggedIn emitted');
      handler.isLoggedIn()
        .then(() => {
          emitter.emit('setLang');
        })
        .catch((e) => {
          console.log(e);
          emitter.emit('login');
        });
    });

    emitter.on('login', () => {
      console.log('login emitted');
      handler.login()
        .then(() => emitter.emit('isLoggedIn'))
        .catch(() => emitter.emit('exit'));
    });

    emitter.on('setLang', () => {
      console.log('setLang emitted');
      if (!handler.profile.lang && process.env.FB_LANG) {
        handler.setLang()
          .then(() => {
            emitter.emit('downloadPhoto');
          })
          .catch((e) => {
            console.log(e);
            emitter.emit('checkPointHandler');
          });
      } else {
        emitter.emit('downloadPhoto');
      }
    });

    emitter.on('downloadPhoto', () => {
      console.log('downloadPhoto emitted');
      if (!handler.profile.fbPhoto) {
        handler.downloadPhoto()
          .then(() => emitter.emit('uploadPhoto'))
          .catch((e) => {
            console.log(e);
            emitter.emit('firstSearch');
          });
      } else {
        emitter.emit('uploadPhoto');
      }
    });

    emitter.on('uploadPhoto', () => {
      console.log('uploadPhoto emitted');
      if (!handler.profile.fbPhotoUploaded) {
        handler.uploadPhoto()
          .then(() => emitter.emit('firstSearch'))
          .catch((e) => {
            console.log(e);
            emitter.emit('checkPointHandler');
          });
      } else {
        emitter.emit('firstSearch');
      }
    });

    emitter.on('firstSearch', () => {
      console.log('firstSearch emitted');

      if (!handler.profile.searchKeys) {
        emitter.emit('getSearchKey', 1);
      } else {
        emitter.emit('userInfo');
      }
    });

    emitter.on('getSearchKey', (numKeys) => {
      console.log('getSearchKey emitted');
      handler.getSearchKeys(numKeys);
      emitter.emit('searchPages');
    });

    emitter.on('searchPages', () => {
      console.log('searchPages emitted');

      handler.likeSearchResults()
        .then(() => emitter.emit('userInfo'))
        .catch((e) => {
          console.log(e);
          emitter.emit('checkPointHandler');
        });
    });

    emitter.on('userInfo', () => {
      console.log('userInfo emitted');

      if (!handler.profile.fbUserName) {

        handler.userInfo()
          .then(status => {
            if (status) {
              emitter.emit('createPage');
            } else {
              emitter.emit('addFriends');
            }
          })
          .catch((e) => {
            console.log(e);
            emitter.emit('checkPointHandler');
          });
      } else {
        emitter.emit('createPage');
      }
    });

    emitter.on('createPage', () => {
      console.log('createPage emitted');

      if (!handler.profile.fbPage) {
        handler.createPage()
          .then((status) => {
            if (status) {
              emitter.emit('publications');
            } else {
              emitter.emit('addFriends');
            }
          })
          .catch((e) => {
            console.log(e);
            emitter.emit('checkPointHandler');
          });
      } else {
        emitter.emit('publications');
      }

    });

    emitter.on('publications', () => {
      console.log('publications emitted');

      if (handler.profile.fbPage) {
        handler.publish()
          .then(() => {
            emitter.emit('addFriends');
          })
          .catch((e) => {
            console.log(e);
            emitter.emit('checkPointHandler');
          });
      } else {
        emitter.emit('addFriends');
      }

    });

    emitter.on('addFriends', () => {
      console.log('addFriends emitted');

      handler.addFriends()
        .then(() => {
          emitter.emit('friendRequests');
        })
        .catch((e) => {
          console.log(e);
          emitter.emit('exit');
        });
    });

    emitter.on('friendRequests', () => {
      console.log('friendRequests emitted');

      handler.friendRequests()
        .then(() => {
          emitter.emit('payOrder');
        })
        .catch((e) => {
          console.log(e);
          emitter.emit('exit');
        });
    });

    emitter.on('payOrder', () => {
      console.log('payOrder emitted');
      if (
        !handler.profile.checkPoint &&
        !handler.profile.payOrder &&
        handler.profile.fbPublications
      ) {
        handler.payOrder()
          .then(() => {
            emitter.emit('exit');
          })
          .catch(() => {
            emitter.emit('exit');
          });
      } else {
        emitter.emit('exit');
      }
    });

    emitter.on('exit', () => {
      console.log('exit emitted');
      handler.exit()
        .then(() => {
          delete handler;
          resolve()
        })
        .catch((e) => {
          delete handler;
          reject(e)
        });
    });

    console.log('startHandling');

    if (id) {
      profile = getProfile(id);
      addProfileNotes(id);
    } else {
      id = getLastId() + 1;
      profile = Object.create(null);
    }

    if (
      profile.days &&
      typeof +profile.days === 'number' &&
      profile.created &&
      (+profile.created + +profile.days * 24 * 60 * 60 * 1000) < Date.now()
    ) {
      resolve(false);
      updateProfileName(id);
      return;
    }

    if (profile && profile.checkPoint && profile.checkPoint === 'banned') {
      resolve(false);
      updateProfileName(id);
      return;
    }

    let accountStr;

    if (initData && initData.accountStr) {
      accountStr = initData.accountStr;
    }

    if (!profile.fbUser && !profile.fbPassword) {
      try {

        if (!accountStr) {
          let accounts = fileToArray(accountFile);
          if (!accounts.length) {
            resolve(false);
            return;
          }
          accountStr = accounts[0];

          // debug
          arrayToFile(accountFile, [
            ...accounts.slice(1)
          ]);
        }

        const accountArr = accountStr.split(';');
        profile.fbUser = accountArr[0];
        profile.fbPassword = accountArr[1];
        if (initData) {
          if (initData.accountStr) {
            delete initData.accountStr;
          }
          profile = { ...profile, ...initData };
        }
        saveProfile(id, profile);
      } catch (e) {
        resolve(false);
        return;
      }
    }

    emitter.emit('startProfile');

    // if(profile.url && profileId){
    //   try {
    //     isProfileActive(profileId)
    //       .then((active) => {
    //         if(active){
    //           saveProfile(profileId, profile);
    //           emitter.emit('driver');
    //         } else {
    //           profile.url = undefined;
    //           saveProfile(profileId, { url: undefined });
    //           emitter.emit('startProfile');
    //         }
    //       })
    //       .catch((e) => {
    //         console.log(e);
    //       });
    //   } catch(e) {
    //     console.log(e);
    //     resolve(false);
    //   }
    // } else {
    //   emitter.emit('startProfile');
    // }

  //   if (profileId) {
  //     emitter.emit('startProfile');
  //   } else {
  //     resolve(false);
  //     return;
  //   }

  });

}

module.exports = { account2profile, accountHandler, profileHandler, currentStatus, startHandling };
