const path = require('path');
const { createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { Builder, By, Key, until, FileDetector } = require('selenium-webdriver');
const { getStatus } = require('selenium-webdriver/http/util');
const base64ToImage = require('base64-to-image');

const { arrayToFile, banPhoneNumber, createImageCaptchaTask, createReCaptchaTask, downloadImage, fileToArray, fileToObject, getImageCaptchaTaskResult, getPhoneNumber, getProfile, getRandomInt, getReCaptchaTaskResult, getSmsCode, objectToFile, saveProfile } = require('../utils');
const { startProfile, stopProfile, isProfileActive } = require('../controllers/profiles');
const { errorLogFile, pagesFile, profileFile, siteKey, debug } = require('../config');

class AccountHandler {

  constructor(id = false) {
    this.checkPointProcessing = false;
    this.waitingTime = +process.env.WAITING_TIME || 15000;
    // this.waitingTime = 2000;
    // this.driver = driver;
    this.id = id;
    this.profile = getProfile(id);
  }


  error(error) {
    if (error && error.message) {
      throw new Error(error.message);
    } else if (typeof error === 'string') {
      throw new Error(error);
    }
  }


  save() {
    saveProfile(this.id, this.profile);
  }


  async startProfile() {
    return this.getConnectStatus()
      .catch(() => {
        return isProfileActive(this.profile)
          .then((active) => {
            if (active) {
              return this.exit();
            }
          })
          .then(() => startProfile(this.profile))
          .then((status) => {
            if (status) {
              this.save();
            } else {
              this.error('Error start profile');
            }
          })
          .catch((e) => { this.error(e) });
      });
  }


  async stopProfile() {
    if (this.profile) {
      return stopProfile(this.profile)
        .then(() => true)
        .catch(() => false);
    } else {
      return false;
    }
  }


  async restartProfile() {

    if (this.checkPointTimer) {
      clearInterval(this.checkPointTimer);
      this.checkPointTimer = undefined;
    }

    return this.exit()
      .then(() => this.startProfile())
      .then((status) => {
        if (status) {
          return this.buildDriver()
            .then(() => this.driver.get('https://www.facebook.com/'))
            .then(() => this.isLoggedIn())
            .then(
              () => this.testCheckPoint(),
              () => this.login()
                .then(() => this.testCheckPoint())
                .catch(() => { throw 'Error restart profile 1'; })
            )
            .catch(() => { throw 'Error restart profile 2'; });
        } else { throw 'Error restart profile 3'; }
      })
      .then(() => {
        if (this.currentAction && this[this.currentAction] && this[this.currentAction] instanceof Function) {
          return this[this.currentAction]();
        }
      })
      .catch((e) => {
        console.log(e);
        throw 'Error restart profile 4';
      });
  }

  async getConnectStatus() {
    if (this.profile && this.profile.url) {
      return getStatus(this.profile.url)
        .catch(() => { throw new Error('Error connect to browser'); });
    } else {
      throw new Error('Not set profile url');
    }
  }


  async testConnect() {
    return this.getConnectStatus()
      .catch(() => this.restartProfile());
  }


  async buildDriver() {
    this.driver = new Builder()
      .forBrowser('chrome')
      .usingServer(this.profile.url)
      .build();
    this.driver.setFileDetector(new FileDetector());
  }


  async exit() {

    if (this.checkPointTimer) {
      clearInterval(this.checkPointTimer);
    }
    if (this.profile.isLoggedIn) {
      this.profile.isLoggedIn = undefined;
    }

    return this.getConnectStatus()
      .then(() => this.driver.quit())
      .then(() => new Promise((resolve, reject) => {
        const loop = (i) => {
          if (i < 1000) {
            this.getConnectStatus()
              .then(() => setTimeout(() => loop(++i), 300))
              .catch(() => resolve());
          } else {
            reject();
          }
        }
        loop(0);
      }))
      .then(() => {
        if (this.profile.url) {
          this.profile.url = undefined;
        }
        this.save();
      })
      .catch(() => stopProfile(this.profile)
        .then((status) => {
          if (status) {
            return new Promise((resolve, reject) => {
              const loop = (i) => {
                if (i < 1000) {
                  isProfileActive(this.profile)
                    .then((status) => {
                      if (status) {
                        setTimeout(() => loop(++i), 300);
                      } else {
                        if (this.profile.url) {
                          this.profile.url = undefined;
                        }
                        this.save();
                        resolve();
                      }
                    })
                    .catch((e) => {
                      console.log(e);
                    });
                } else {
                  reject(`Failed to stop profile ${this.id}`);
                }
              }
              loop(0);
            });
          } else {
            throw new Error(`Failed to stop profile ${this.id}`);
          }
        })
      );
  }


  async sleep(seconds) {
    if (this.driver) {
      return this.driver.sleep(getRandomInt(seconds * 1000, (seconds + 3) * 1000));
    }
  }


  async findElement(selector, resolve, value) {

    if (this.profile.checkPoint && !this.checkPointProcessing) {
      if (typeof resolve !== 'undefined' && resolve instanceof Function) {
        if (typeof value !== 'undefined') {
          resolve(value);
        } else {
          resolve();
        }
      }
      throw new Error('Check point detected');
    }

    if (!this.driver) {
      throw new Error('Not found driver');
    }

    return this.driver.wait(until.elementLocated(By.css(selector)), this.waitingTime)
      .catch(() => this.errorLog(selector)
        .then(() => {
          if (typeof resolve !== 'undefined' && resolve instanceof Function) {
            if (typeof value !== 'undefined') {
              resolve(value);
            } else {
              resolve();
            }
          }
          throw new Error(`Not found "${selector}"`);
        })
      );

  }


  async findElements(selector, resolve, value) {

    if (this.profile.checkPoint && !this.checkPointProcessing) {
      if (typeof resolve !== 'undefined' && resolve instanceof Function) {
        if (typeof value !== 'undefined') {
          resolve(value);
        } else {
          resolve();
        }
      }
      throw new Error('Check point detected');
    }

    if (!this.driver) {
      throw new Error('Not found driver');
    }

    return this.driver.wait(until.elementsLocated(By.css(selector)), this.waitingTime)
      .then(elements => elements,
        () => this.errorLog(selector)
          .then(() => {
            if (typeof resolve !== 'undefined') {
              if (typeof value !== 'undefined') {
                resolve(value);
              } else {
                resolve();
              }
            }
            throw new Error(`Not found "${selector}"`);
          })
      );

  }


  async findClickElement(selector, resolve, value) {

    if (this.profile.checkPoint && !this.checkPointProcessing) {
      if (typeof resolve !== 'undefined' && resolve instanceof Function) {
        if (typeof value !== 'undefined') {
          resolve(value);
        } else {
          resolve();
        }
      }
      throw new Error('Check point detected');
    }

    if (!this.driver) {
      throw new Error('Not found driver');
    }

    return this.sleep(1)
      .then(() => this.driver.wait(until.elementLocated(By.css(selector)), this.waitingTime))
      .then(element => element.click()
        .then(
          () => element,
          () => this.errorLog(selector, 1)
            .then(() => {
              if (typeof resolve !== 'undefined') {
                if (typeof value !== 'undefined') {
                  resolve(value);
                } else {
                  console.log('not clickable resolve');
                  resolve();
                }
              }
              throw new Error(`"${selector}" is not clickable`);
            })
        ),
        () => this.errorLog(selector)
          .then(() => {
            if (typeof resolve !== 'undefined') {
              if (typeof value !== 'undefined') {
                resolve(value);
              } else {
                console.log('not found resolve');
                resolve();
              }
            }
            throw new Error(`Not found "${selector}"`);
          })
      );

  }


  async findSendKeys(selector, keys, resolve, value) {

    if (this.profile.checkPoint && !this.checkPointProcessing) {
      if (typeof resolve !== 'undefined' && resolve instanceof Function) {
        if (typeof value !== 'undefined') {
          resolve(value);
        } else {
          resolve();
        }
      }
      throw new Error('Check point detected');
    }

    if (!this.driver) {
      throw new Error('Not found driver');
    }

    return this.sleep(1)
      .then(() => this.driver.wait(until.elementLocated(By.css(selector)), this.waitingTime))
      .then(
        element => element.sendKeys(keys)
          .then(
            () => element,
            () => this.errorLog(selector, 2)
              .then(() => {
                if (typeof resolve !== 'undefined') {
                  if (typeof value !== 'undefined') {
                    resolve(value);
                  } else {
                    resolve();
                  }
                }
                throw new Error(`Error to send keys to "${selector}"`);
              })
          ),
        () => this.errorLog(selector)
          .then(() => {
            if (typeof resolve !== 'undefined') {
              if (typeof value !== 'undefined') {
                resolve(value);
              } else {
                resolve();
              }
            }
            throw new Error(`Not found "${selector}"`);
          })
      );

  }


  async scrollClickElement(selector) {
    return new Promise((resolve, reject) => {
      const loop = (i) => {
        let rect;
        let direction = 1;
        let scrollX = 0;
        let scrollY = 0;
        let windowWidth = 0;
        let windowHeight = 0;
        if (i < 10) {
          this.findClickElement(selector)
            .then(resolve)
            .catch(() => {
              return this.findElement(selector)
                .then(async element => {
                  rect = await element.getRect();
                  scrollX = await this.driver.executeScript('return window.pageXOffset;');
                  scrollY = await this.driver.executeScript('return window.pageYOffset;');
                  windowWidth = await this.driver.executeScript('return document.documentElement.clientWidth;');
                  windowHeight = await this.driver.executeScript('return document.documentElement.clientHeight;');
                })
                .then(() => this.sleep(1))
                .then(() => {
                  if (scrollX + windowWidth < rect.x) {
                    direction = 1;
                  }
                  if (scrollX > rect.x) {
                    direction = -1;
                  }
                  return this.driver.executeScript(`window.scrollBy(${getRandomInt(150, 200) * direction}, 0)`);
                })
                .then(() => this.sleep(1))
                .then(() => {
                  if (scrollY + windowHeight < rect.y) {
                    direction = 1;
                  }
                  if (scrollY > rect.y) {
                    direction = -1;
                  }
                  return this.driver.executeScript(`window.scrollBy(0, ${getRandomInt(150, 200) * direction})`);
                })
                .then(() => loop(++i))
                .catch(reject);
            })
        } else {
          reject();
        }
      };
      loop(0);
    });
  }


  async errorLog(selector, type = 0) {

    let error = ['notFound', 'notClickable', 'sendKeys'];

    let errors = fileToObject(errorLogFile);
    if (errors[selector]) {
      if (errors[selector][error[type]]) {
        ++errors[selector][error[type]];
      } else {
        errors[selector][error[type]] = 1;
      }
    } else {
      errors = {
        ...errors,
        [selector]: {
          [error[type]]: 1
        }
      };
    }
    objectToFile(errorLogFile, errors);
    if (this.profile.errors) {
      if (this.profile.errors[selector]) {
        if (this.profile.errors[selector][error[type]]) {
          ++this.profile.errors[selector][error[type]];
        } else {
          this.profile.errors[selector][error[type]] = 1;
        }
      } else {
        this.profile.errors = {
          ...this.profile.errors,
          [selector]: {
            [error[type]]: 1
          }
        };
      }
    } else {
      this.profile.errors = {
        [selector]: {
          [error[type]]: 1
        }
      };
    }
    this.save();
    return this.errorReport(selector);
  }


  async errorReport(selector) {
    if (debug) {
      const timeStamp = Date.now();
      const reportPath = `../data/report/${this.currentAction ? this.currentAction + '/' : '/'}${selector.replace(/[\W]+/g, '_')}`;
      mkdirSync(path.join(__dirname, reportPath), { recursive: true });

      return this.driver.takeScreenshot()
        .then((screenshot) => {
          screenshot = `data:image/png;base64,${screenshot}`;
          base64ToImage(
            screenshot,
            path.join(__dirname, reportPath, '/'),
            { fileName: `screenshot_${this.id}_${timeStamp}`, type: 'png' }
          );
        })
        .then(() => this.driver.getPageSource())
        .then((source) => {
          writeFileSync(path.join(__dirname, reportPath, `source_${this.id}_${timeStamp}.html`), source);
          writeFileSync(path.join(__dirname, reportPath, `selector_${this.id}_${timeStamp}.txt`), selector);
        })
        .catch((e) => console.log(e))
    }
  }


  async testCheckPoint() {

    this.checkPointTimer = setInterval(() => {
      console.log('test check point');
      this.driver.getCurrentUrl()
        .then(
          (currentUrl) => {
            if (/facebook\.com\/checkpoint/.test(currentUrl)) {
              if (this.profile && !this.profile.checkPoint) {
                this.profile.checkPoint = 'notDefined';
                this.save();
              }
              if (this.checkPointTimer) {
                clearInterval(this.checkPointTimer);
                this.checkPointTimer = undefined;
              }
            }
          },
          e => console.log(e)
        );
    }, 5000);

  }


  async isLoggedIn() {

    return new Promise((resolve, reject) => {

      this.driver.switchTo().defaultContent()
        .then(() => this.findElement('#email'))
        .then(
          () => {
            console.log('Not logged in');
            reject();
          },
          () => this.findElement('input[name="email"]')
        )
        .then(() => {
          console.log('Not logged in');
          reject();
        })
        .catch((e) => {
          console.log(e);
          resolve('Logged in');
        });

    });

  }


  async login() {

    this.currentAction = 'login';

    return new Promise((resolve, reject) => {
      this.testConnect()
        .then(() => this.sleep(1))
        .then(() => this.findElement('#email'))
        .then(
          emailField => emailField,
          () => this.findElement('input[name="email"]', reject)
        )
        .then(emailField => emailField.clear()
          .then(() => emailField.sendKeys(this.profile.fbUser)
            .then(
              null,
              () => {
                reject();
                this.errorLog('#email', 2);
              }
            )
          )
        )
        .then(() => this.sleep(1))
        .then(() => this.findElement('#pass'))
        .then(
          passField => passField,
          () => this.findElement('input[name="pass"]', reject)
        )
        .then(passField => passField.clear()
          .then(() => passField.sendKeys(this.profile.fbPassword)
            .then(
              null,
              () => {
                reject();
                this.errorLog('#pass', 2);
              }
            )
          )
        )
        .then(() => this.sleep(1))
        .then(() => this.findClickElement('label#loginbutton input'))
        .then(
          null,
          () => this.findClickElement('button[name="login"]', reject)
        )
        .then(() => resolve())
        .catch(e => console.log(e));
    });

  }


  async setLang() {

    this.currentAction = 'setLang';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    let lang;
    if (!process.env.FB_LANG) {
      return false;
    }
    lang = process.env.FB_LANG;

    return new Promise((resolve, reject) => {
      this.testConnect()
        .then(() => this.findClickElement('#userNavigationLabel'))
        .then(() => this.findClickElement('a[href*="facebook.com/settings"]'))
        .then(() => this.findClickElement('a[href*="facebook.com/settings?tab=language"]'))
        .then(() => this.findClickElement('a[href="/settings?tab=language&section=account"]'))
        .then(() => this.findClickElement('select[name="new_language"]'))
        .then(() => this.findClickElement('select[name="new_language"] option[value="' + lang + '"]'))
        .then(() => this.findClickElement('form[action="/ajax/settings/language/account.php"] input[type="submit"]'))
        .then(() => {
          this.profile.lang = lang;
          this.save();
          resolve();
        })
        .catch((e) => {
          console.log(e);
          reject(e);
        });
    });
  }


  async downloadPhoto() {
    if (this.profile &&
      !(
        this.profile.fbPhoto &&
        existsSync(path.join(__dirname, '../public/photo', this.profile.fbPhoto))
      )) {
      return downloadImage('https://thispersondoesnotexist.com/image', path.join(__dirname, '../public/photo', this.id + '.jpg'))
        .then(() => {
          this.profile.fbPhoto = `${this.id}.jpg`;
          this.save();
        })
        .catch((e) => { throw e; });
    }
  }


  async uploadPhoto() {

    this.currentAction = 'uploadPhoto';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    return this.downloadPhoto()
      .then(() => this.testConnect())
      .then(() => this.sleep(3))
      .then(() => this.findClickElement('[data-click="profile_icon"]'))
      .then(() => this.sleep(1))
      .then(() => this.findClickElement('.photoContainer a[rel="dialog"]'))
      .then(() => this.findElement('a[data-action-type="upload_photo"] input[type="file"]'))
      .then(element => this.sleep(2)
        .then(() => element))
      .then((uploadField) => uploadField.sendKeys(path.join(__dirname, '../public/photo', this.profile.fbPhoto)))
      .then(() => this.sleep(10))
      .then(() => this.findClickElement('.uiOverlayFooter a[data-hover="tooltip"]'))
      .then(() => this.sleep(10))
      .then(() => this.findClickElement('.uiOverlayFooter button[data-testid="profilePicSaveButton"]'))
      .then(() => this.sleep(11))
      .then(() => {
        this.profile.fbPhotoUploaded = true;
        this.save();
      })
      .catch((e) => {
        console.log(e);
      });

  }


  getSearchKeys(numKeys) {

    const searchKeys = fileToArray(pagesFile);
    if (!this.profile.searchKeys) {
      this.profile.searchKeys = {};
    }

    let startNumKeys = Object.keys(this.profile.searchKeys).length;

    if (searchKeys.length > 0) {
      if (searchKeys.length - startNumKeys > numKeys) {
        let key;
        while (Object.keys(this.profile.searchKeys).length - startNumKeys < numKeys) {
          key = searchKeys[getRandomInt(0, searchKeys.length - 1)];
          if (!this.profile.searchKeys[key]) {
            this.profile.searchKeys[key] = 0;
          }
        }
      } else {
        searchKeys.forEach((key) => {
          if (!this.profile.searchKeys[key]) {
            this.profile.searchKeys[key] = 0;
          }
        });
      }
    } else {
      if (startNumKeys === 0) {
        this.profile.searchKeys['похудение'] = 0;
      }
    }
    this.save();
  }


  async openSearchPage(searchKey) {

    this.currentAction = 'openSearchPage';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    return this.testConnect()
      .then(() => this.sleep(1))
      .then(() => this.findClickElement('h1[data-click="bluebar_logo"] a'))
      .then(() => this.sleep(1))
      .then(() => this.findElement('input[data-testid="search_input"]'))
      .then(input => input.sendKeys(searchKey, Key.RETURN))
      .then(() => this.sleep(1))
      .then(() => this.findClickElement('li[data-edge="keywords_pages"] a'))
      .then(() => true)
      .catch((e) => {
        console.log(e);
        return false;
      });
  }


  async likeSearchResults() {

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    return new Promise((resolve) => {
      if (this.profile.searchKeys && Object.keys(this.profile.searchKeys).length > 0) {
        let keys = Object.keys(this.profile.searchKeys);
        const loop = (i) => {
          if (i < keys.length) {
            if (this.profile.searchKeys[keys[i]] === 0) {
              this.openSearchPage(keys[i])
                .then((status) => {
                  if (status) {
                    return this.putLikes();
                  } else {
                    resolve();
                  }
                })
                .then((numLikes) => {
                  if (numLikes && typeof +numLikes === 'number' && +numLikes > 0) {
                    this.profile.searchKeys[keys[i]] = +numLikes;
                    this.save();
                    loop(++i);
                  }
                });
            } else {
              loop(++i);
            }
          } else {
            resolve();
          }
        };
        loop(0);
      } else {
        resolve();
      }
    });
  }


  async putLikes() {

    this.currentAction = 'putLikes';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    let numLikes = 0;

    try {
      return this.testConnect()
        .then(() => this.sleep(1))
        .then(() => new Promise((resolve) => {
          const numScrolls = getRandomInt(1, 3);
          const loop = (i) => {
            let prevScrollY;
            if (i < numScrolls) {
              this.sleep(0)
                .then(() => this.driver.executeScript('return window.scrollY;'))
                .then((currentScrollY) => {
                  prevScrollY = currentScrollY;
                  return this.driver.executeScript('window.scrollBy(0, window.innerHeight);');
                })
                .then(() => this.driver.executeScript('return window.scrollY;'))
                .then((currentScrollY) => {
                  if (prevScrollY === currentScrollY) resolve();
                  else loop(++i);
                })
                .catch((e) => {
                  console.log(e);
                  resolve();
                });
            } else {
              resolve();
            }
          };
          loop(0);
        }))
        .then(() => this.sleep(1), e => console.log(e))
        .then(() => new Promise(resolve => {
          const loop = () => {
            this.sleep(1)
              .then(() => this.driver.executeScript('window.scrollBy(0, -window.innerHeight)'))
              .then(() => this.driver.executeScript('return window.scrollY;'))
              .then((currentScrollY) => {
                if (currentScrollY === 0) resolve(true);
                else loop();
              })
              .catch((e) => {
                console.log(e);
                resolve(false);
              });
          };
          loop();
        }))
        .then(() => this.findElements('.PageLikeButton'))
        .then((likeButtons) => new Promise((resolve) => {
          if (likeButtons && likeButtons.length) {
            const loop = (i) => {
              if (i < likeButtons.length) {
                this.sleep(2)
                  .then(() => {
                    if (getRandomInt(0, 2) === 1) {
                      return likeButtons[i].click()
                        .then(
                          () => {
                            ++numLikes;
                            console.log('like #', numLikes + 1);
                          },
                          e => console.log(e)
                        );
                    }
                  })
                  .then(() => loop(++i), () => loop(++i));
              } else resolve(numLikes);
            };
            loop(0);
          } else resolve(numLikes);
        }));

    } catch (e) {
      console.log(e.message);
      return numLikes;
    }
  }


  async userInfo() {

    this.currentAction = 'userInfo';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    return new Promise((resolve) => {
      this.testConnect()
        .then(() => this.sleep(1))
        .then(() => this.findClickElement('[data-click="profile_icon"]', resolve, false))
        .then(() => this.findElement('#fbProfileCover h1 a', resolve, false))
        .then(element => element.getText())
        .then((name) => {
          this.profile.fbUserName = name;
          return this.findElement('#fbProfileCover h1 a', resolve, false)
            .then(element => element.getAttribute('href'));
        })
        .then((url) => {
          this.profile.fbUserUrl = url;
          this.save();
          resolve(true);
        })
        .catch((e) => {
          console.log(e);
          resolve(false)
        });
    });

  }


  async createPage() {

    this.currentAction = 'createPage';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    return new Promise((resolve) => {
      this.testConnect()
        .then(() => this.findClickElement('h1[data-click="bluebar_logo"] a')
          .then(() => this.sleep(5))
          .then(() => this.findClickElement('a[href*="category=your_pages"]'))
          .then(() => this.sleep(5))
          .then(() => this.findElement('#page_browser_your_pages>div>div>div>div>a'))
          .then((element) => element.getAttribute('href'))
          .then((href) => {
            this.profile.fbPage = href;
            resolve(true);
            return true;
          })
          .catch(() => false)
        )
        .then((pageCreated) => {
          if (pageCreated) {
            throw new Error('Page already created');
          }
        })
        .then(() => this.sleep(2))
        .then(() => this.findClickElement('#creation_hub_entrypoint'))
        .then(() => this.sleep(1))
        .then(() => this.findClickElement('a[href*="facebook.com/pages/create"]'))
        .then(() => this.sleep(7))
        .then(() => this.scrollClickElement('button[data-testid="NON_BUSINESS_SUPERCATEGORYSelectButton"]'))
        .then(() => this.sleep(2))
        .then(() => this.findElement('#NON_BUSINESS_SUPERCATEGORYPageNameInput'))
        .then((element) => {
          return new Promise((resolve, reject) => {
            let i = 1;
            const loop = (i) => {
              if (i <= 3) {
                const num = i > 1 ? ` ${i}` : '';
                const pageName = `${this.profile.fbUserName}${num}`;
                element.sendKeys(pageName)
                  .then(() => this.sleep(2))
                  .then(() => {
                    let pageCat = 'Блоггер';
                    if (process.env.FB_LANG) {
                      try {
                        let categories = fileToArray('themes_' + process.env.FB_LANG + '.txt');
                        if (categories.length > 0) {
                          pageCat = categories[getRandomInt(0, categories.length - 1)];
                        }
                      } catch (e) {
                        console.log(e.message);
                      }
                    }
                    return this.findElement('#NON_BUSINESS_SUPERCATEGORYPageSuperCategoryTypeaheadContainerID input[data-testid="searchable-text-input"]')
                      .then(element => element.sendKeys(pageCat));
                  })
                  .then(() => this.sleep(1))
                  .then(() => this.findClickElement('div[data-testid="NON_BUSINESS_SUPERCATEGORYFormContainer"] button'))
                  .then(() => resolve())
                  .catch(() => {
                    ++i;
                    loop(i);
                  })
              } else {
                reject();
              }
            };
            loop(i);
          })
        })
        // .then(element => element.sendKeys(this.profile.fbUserName))
        // .then(() => this.sleep(2))
        // .then(() => {
        //   let pageCat = 'Блоггер';
        //   if (process.env.FB_LANG) {
        //     try {
        //       let categories = fileToArray('themes_' + process.env.FB_LANG + '.txt');
        //       if (categories.length > 0) {
        //         pageCat = categories[getRandomInt(0, categories.length - 1)];
        //       }
        //     } catch (e) {
        //       console.log(e.message);
        //     }
        //   }
        //   return this.findElement('#NON_BUSINESS_SUPERCATEGORYPageSuperCategoryTypeaheadContainerID input[data-testid="searchable-text-input"]')
        //     .then(element => element.sendKeys(pageCat));
        // })
        // .then(() => this.sleep(1))
        // .then(() => this.findClickElement('div[data-testid="NON_BUSINESS_SUPERCATEGORYFormContainer"] button'))
        .then(() => this.sleep(15))
        .then(() => this.findClickElement('div#globalContainer > div#content > div > div.clearfix > div.rfloat > a[role="button"]'))
        .then(() => this.sleep(2))
        .then(() => this.findClickElement('div#globalContainer > div#content > div > div.clearfix > div.rfloat > a[role="button"]'))
        .then(() => this.sleep(2))
        // .then(() => this.findClickElement('div#globalContainer > div#content > div > div.clearfix > div.rfloat > a[role="button"]'))
        .then(() => this.sleep(15)
          .then(() => this.sleep(5))
          .then(() => this.findClickElement('button.button.layerCancel')) // окно с предложением сообщить о своей странице
          .catch(() => null)
        )
        .then(() => this.driver.getCurrentUrl())
        .then(url => {
          this.profile.fbPage = url;
          this.save();
          resolve(true);
        })
        .catch((e) => {
          console.log(e);
          resolve(false);
        });
    });

  }


  async publish() {

    this.currentAction = 'publish';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    const dateObj = new Date();
    const date = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;

    if (
      this.profile.postsPerDay &&
      this.profile.fbPublications &&
      this.profile.fbPublications[date] &&
      this.profile.fbPublications[date].length >= this.profile.postsPerDay
    ) {
      return;
    }

    return new Promise((mainResolver) => {
      this.testConnect()
        .then(() => this.sleep(2))
        .then(() => this.findClickElement('h1[data-click="bluebar_logo"] a'))
        .then(() => this.sleep(5))
        .then(() => this.findClickElement('a[data-testid="left_nav_item_Страницы"]'))
        .then(() => this.sleep(5))
        .then(() => this.findClickElement('#page_browser_your_pages .clearfix ul.uiList li:first-child a'))
        .then(() => this.sleep(5))
        .then(() => this.findClickElement('div[role="dialog"] div[data-testid="react-composer-root"] div[data-testid="status-attachment-mentions-input"][role="textbox"] div[data-editor] div[data-offset-key]'))
        .then(() => this.sleep(1))
        .then(() => {
          const publictextArr = fileToArray('publictext.txt');
          const urlsforpublication = fileToArray('urlsforpublication.txt');
          let textField;

          if (publictextArr.length > 0 && urlsforpublication.length > 0) {
            const publictext = publictextArr[getRandomInt(0, publictextArr.length - 1)].split(' ');
            let randomUrl = urlsforpublication[getRandomInt(0, urlsforpublication.length - 1)];
            return new Promise((resolve) => {

              const loop = (i) => {
                if (i < publictext.length) {
                  this.findElement('div[role="dialog"] div[data-testid="react-composer-root"] div[data-testid="status-attachment-mentions-input"][role="textbox"]')
                    .then(element => {
                      textField = element;
                      return textField.sendKeys(publictext[i]);
                    })
                    .then(() => this.sleep(0.4))
                    .then(() => textField.sendKeys(' '))
                    .then(() => this.sleep(0.4))
                    .then(() => loop(++i))
                    .catch((e) => {
                      console.log(e);
                      resolve(false);
                    });
                } else {
                  resolve(true);
                }
              };
              loop(0);
            })
              .then((status) => {
                if (status) {
                  return textField.sendKeys(randomUrl)
                    .then(() => this.sleep(2))
                    .then(() => this.findClickElement('button[data-testid="react-composer-post-button"]'))
                    .then(() => this.sleep(15))
                    .then(() => {
                      let text = { [randomUrl]: publictext.join(' ') };
                      if (this.profile.fbPublications) {
                        if (this.profile.fbPublications[date]) {
                          this.profile.fbPublications[date].push(text);
                        } else {
                          this.profile.fbPublications[date] = [text];
                        }
                      } else {
                        this.profile.fbPublications = {
                          [date]: [text]
                        };
                      }
                      this.save();
                      mainResolver();
                    })
                    .catch((e) => {
                      console.log(e);
                    });
                }
              })
              .catch((e) => {
                console.log(e);
              });
          }
        })
        .catch((e) => {
          console.log(e);
          mainResolver();
        });
    });

  }


  async addFriends() {

    this.currentAction = 'addFriends';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    if (!this.profile.friendsAdded) {
      this.profile.friendsAdded = 0;
    }

    return new Promise((mainResolver) => {

      this.testConnect()
        .then(() => this.sleep(1))
        .then(() => this.findClickElement('#fbRequestsJewel a.jewelButton'))
        .then(() => this.sleep(1))
        .then(() => this.findClickElement('#fbRequestsList a.seeMore'))
        .then(() => this.sleep(5))
        .then(() => this.findElements('.ruResponseButtons button:nth-child(1)'))
        .then((buttons) => {
          if (buttons && buttons.length) {
            return new Promise((resolve) => {
              const loop = (i) => {
                if (i < buttons.length) {
                  buttons[i].click()
                    .then(
                      () => this.sleep(1),
                      e => console.log(e)
                    )
                    .then(() => loop(++i));
                } else {
                  resolve(i);
                }
              };
              loop(0);
            });
          } else {
            return false;
          }
        })
        .then(friendsAdded => {
          if (friendsAdded) {
            this.profile.friendsAdded += friendsAdded;
            this.save();
          }
          mainResolver();
        })
        .catch((e) => {
          console.log(e);
          mainResolver();
        });

    });

  }


  async friendRequests() {

    this.currentAction = 'friendRequests';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    if (!this.profile.friendRequests) {
      this.profile.friendRequests = 0;
    }

    return new Promise((mainResolver) => {
      this.testConnect()
        .then(() => this.sleep(2))
        .then(() => this.driver.wait(until.urlContains('facebook.com/friends/requests'), this.waitingTime))
        .then(() => true, () => false)
        .then((url) => new Promise((resolve, reject) => {
          if (url) {
            resolve();
          } else {
            return this.sleep(1)
              .then(() => this.findClickElement('#fbRequestsJewel a.jewelButton'))
              .then(() => this.sleep(1))
              .then(() => this.findClickElement('#fbRequestsList a.seeMore'))
              .then(() => this.sleep(5))
              .then(() => resolve())
              .catch((e) => {
                console.log(e);
                reject();
              });
          }
        }))
        .then(() => this.findElements('.FriendButton button.FriendRequestAdd.addButton'))
        .then((buttons) => {
          if (buttons && buttons.length) {
            let numRequests = 0;
            const loop = (i) => {
              if (i < buttons.length) {
                if (getRandomInt(0, 1)) {
                  buttons[i].click()
                    .then(
                      () => {
                        ++numRequests;
                        return this.sleep(2);
                      },
                      (e) => console.log(e)
                    )
                    .then(() => loop(++i));
                } else {
                  loop(++i);
                }
              } else {
                if (numRequests) {
                  this.profile.friendRequests += numRequests;
                  this.save();
                }
                mainResolver();
              }
            };
            loop(0);
          } else {
            mainResolver();
          }
        })
        .catch((e) => {
          console.log(e);
          mainResolver();
        });
    });

  }


  async payOrder() {

    if (true) {
      return;
    }

    this.currentAction = 'payOrder';

    if (this.profile.checkPoint) {
      throw new Error('Check point detected');
    }

    let durationInput, textarea;

    return this.testConnect()
      .then(() => this.sleep(4))
      .then(() => this.driver.wait(until.elementLocated(By.css('h1[data-click="bluebar_logo"] a')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('a[data-testid="left_nav_item_Страницы"]')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#page_browser_your_pages div.clearfix a.lfloat')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#entity_sidebar div[data-key="tab_posts"] a')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementsLocated(By.css('div[role="article"] form .rfloat button')), this.waitingTime))// изменено
      .then((buttons) => {
        if (buttons && buttons.length) {
          return buttons[getRandomInt(0, buttons.length - 1)].click();
        }
      })
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('div[role="dialog"] div[role="dialog"] span div div:nth-child(2) button[type="button"][aria-disabled="false"]')), this.waitingTime).click())
      .then(() => true, () => true)
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('div[role="dialog"] div[role="dialog"] span div div button[type="button"][aria-disabled="false"]')), this.waitingTime).click())
      .then(() => true, () => true)
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('div[data-testid="boosted_component_dialog"] .lfloat .uiScrollableAreaContent button[data-testid="SUIAbstractMenu/button"]'))).click())
      .then(() => true, () => true)
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementsLocated(By.css('.uiScrollableAreaContent ul[data-testid="SUISelector/menu"] > li[data-testid="SUISelector/menuItem"] > div > div > div')), this.waitingTime))
      .then((currencies) => new Promise((resolve, reject) => {
        if (currencies && currencies.length) {
          (function loop(i) {
            if (i < currencies.length) {
              currencies[i].getText()
                .then((currency) => {
                  if (
                    currency &&
                    typeof currency === 'string' &&
                    currency.trim() === 'Польский злотый'
                  ) {
                    currencies[i].click()
                      .then(() => resolve())
                      .catch(() => reject());
                  } else {
                    loop(++i);
                  }
                })
                .catch((e) => {
                  console.log(e);
                  reject()
                });
            } else {
              console.log('error select currency');
              reject();
            }
          })(0);
        } else {
          console.log('error select currency');
          reject();
        }
      }))
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('input[data-testid="duration_days_editor"]')), this.waitingTime))
      .then((input) => {
        durationInput = input;
        return durationInput.click();
      })
      .then(() => this.driver.sleep(getRandomInt(5, 10) * 100))
      .then(() => durationInput.sendKeys(Key.BACK_SPACE))
      .then(() => this.driver.sleep(getRandomInt(5, 10) * 100))
      .then(() => durationInput.sendKeys(Key.BACK_SPACE))
      .then(() => this.driver.sleep(getRandomInt(5, 10) * 100))
      .then(() => durationInput.sendKeys(Key.BACK_SPACE))
      .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
      .then(() => durationInput.sendKeys(process.env.FB_PROMO_DURATION))
      .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .then(() => new Promise((resolve, reject) => {
        let text;
        this.driver.wait(until.elementLocated(By.css('textarea[data-testid="budget_selector"]')), this.waitingTime)
          .then((el) => {
            textarea = el;
            return textarea.getText();
          })
          .then(value => {
            text = value;
            return textarea.click();
          })
          .then(() => {
            if (text && text.length) {
              const loop = (i) => {
                if (i < text.length) {
                  textarea.sendKeys(Key.BACK_SPACE)
                    .then(() => this.driver.sleep(getRandomInt(300, 700)))
                    .then(() => loop(++i));
                } else {
                  resolve();
                }
              };
              loop(0);
            } else resolve();
          })
      }))
      .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
      .then(() => textarea.sendKeys(process.env.FB_PROMO_BUDGET))
      .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('div[data-testid="boosted_component_dialog"] button[data-testid="primary_button"]')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(150, 200) * 100))
      // доп диалог подтверждения билинговой инфы
      .then(() => this.driver.wait(until.elementsLocated(By.css('[aria-labelledby="BillingDialog"] [data-testid="SUIAbstractMenu/button"]')), this.waitingTime))
      .then(
        (selectors) => {
          if (selectors.length === 2) {
            let countryButton = selectors[0];
            let currencyButton = selectors[1];
            let countryButtonId, currencyButtonId;
            return countryButton.getAttribute('id')
              .then(id => countryButtonId = id)
              .then(() => countryButton.click())
              .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
              .then(() => this.driver.wait(until.elementsLocated(By.css(`div[data-ownerid="${countryButtonId}"] ul li div div`)), this.waitingTime))
              .then((countries) => new Promise((resolve, reject) => {
                if (countries && countries.length) {
                  (function loop(i) {
                    if (i < countries.length) {
                      countries[i].getText()
                        .then((country) => {
                          if (
                            country &&
                            typeof country === 'string' &&
                            (country.trim() === 'Польша' || country.trim() === 'Poland')
                          ) {
                            countries[i].click()
                              .then(() => resolve())
                              .catch(() => reject());
                          } else {
                            loop(++i);
                          }
                        })
                        .catch((e) => {
                          console.log(e);
                          reject()
                        });
                    } else {
                      console.log('error select country');
                      reject();
                    }
                  })(0);
                } else {
                  console.log('error select country');
                  reject();
                }
              }))
              .then(() => currencyButton.getAttribute('id'))
              .then(id => currencyButtonId = id)
              .then(() => currencyButton.click())
              .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
              .then(() => this.driver.wait(until.elementsLocated(By.css(`div[data-ownerid="${currencyButtonId}"] ul li div div`)), this.waitingTime))
              .then((currencies) => new Promise((resolve, reject) => {
                if (currencies && currencies.length) {
                  (function loop(i) {
                    if (i < currencies.length) {
                      currencies[i].getText()
                        .then((currency) => {
                          if (
                            currency &&
                            typeof currency === 'string' &&
                            (currency.trim() === 'Польский злотый')
                          ) {
                            currencies[i].click()
                              .then(() => resolve())
                              .catch(() => reject());
                          } else {
                            loop(++i);
                          }
                        })
                        .catch((e) => {
                          console.log(e);
                          reject();
                        });
                    } else {
                      console.log('error select country');
                      reject();
                    }
                  })(0);
                } else {
                  console.log('error select country');
                  reject();
                }
              }))
              .then(() => this.driver.wait(until.elementLocated(By.css('[aria-labelledby="BillingDialog"] div div div div div div div span div div:nth-child(2) button')), this.waitingTime))
              .then((saveButton) => saveButton.click());

          }
        },
        null
      )
      // доп диалог подтверждения билинговой инфы */
      .then(() => this.driver.sleep(getRandomInt(150, 200) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#XPaymentDialog #XPaymentDialogBody .uiPopover a[role="button"]')), this.waitingTime))
      .then((button) => {
        let countryButton = button;
        let countryButtonId;
        return button.getAttribute('id')
          .then((id) => {
            countryButtonId = id;
          })
          .then(() => countryButton.click())
          .then(() => this.driver.sleep(getRandomInt(10, 20) * 100))
          .then(() => this.driver.wait(until.elementsLocated(By.css(`div[data-ownerid="${countryButtonId}"] ul li a span span`)), this.waitingTime))
          .then((countries) => new Promise((resolve, reject) => {
            if (countries && countries.length) {
              (function loop(i) {
                if (i < countries.length) {
                  countries[i].getText()
                    .then((country) => {
                      if (
                        country &&
                        typeof country === 'string' &&
                        (country.trim() === 'Польша' || country.trim() === 'Poland')
                      ) {
                        countries[i].click()
                          .then(() => resolve())
                          .catch(() => reject());
                      } else {
                        loop(++i);
                      }
                    })
                    .catch((e) => {
                      console.log(e);
                      reject()
                    });
                } else {
                  console.log('error select country');
                  reject();
                }
              })(0);
            } else {
              console.log('error select country');
              reject();
            }
          }))
      })
      .then(() => this.driver.sleep(getRandomInt(150, 200) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('label[for="adyendotpay_PL_input"]')), this.waitingTime).click())
      .then(
        () => this.driver.sleep(getRandomInt(50, 100) * 100),
        (e) => {
          console.log(e);
          return this.driver.wait(until.elementLocated(By.css('label[for="payuPAYU_PBL_PL_input"]')), this.waitingTime).click()
        }
      )
      .then(() => this.driver.sleep(getRandomInt(50, 100) * 100), null)
      .then(() => this.driver.wait(until.elementLocated(By.css('#XPaymentDialogFooter button.layerConfirm')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 100) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#AdsPaymentDisclaimerAcceptButton')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(50, 100) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('input#business_name')), this.waitingTime).sendKeys(this.profile.fbUserName))
      .then(() => this.driver.sleep(getRandomInt(30, 80) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('input#address_street1')), this.waitingTime).sendKeys('Проста'))
      .then(() => this.driver.sleep(getRandomInt(30, 80) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('input#address_city')), this.waitingTime).sendKeys('Варшава'))
      .then(() => this.driver.sleep(getRandomInt(30, 80) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('input#address_postal_code')), this.waitingTime).sendKeys('00-056'))
      .then(() => this.driver.sleep(getRandomInt(30, 80) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#AdsPaymentsSubmitBusinessInfoButton')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(100, 150) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#AdsPaymentsPrepaidAmountButton')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(100, 150) * 100))
      .then(() => this.driver.wait(until.elementLocated(By.css('#XPaymentDialogFooter a:nth-child(2)')), this.waitingTime).click())
      .then(() => this.driver.sleep(getRandomInt(100, 150) * 100))
      .then(() => {
        this.profile.payOrder = true;
        this.save();
      })
      // .then(() => )
      // .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      // .then(() => )
      // .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      // .then(() => )
      // .then(() => this.driver.sleep(getRandomInt(50, 90) * 100))
      .catch((e) => {
        console.log(e);
      });

  }


  async checkPointHandler() {
    if (
      !this.numCheckpoint ||
      (
        this.numCheckpoint &&
        this.profile.checkPoint &&
        this.numCheckpoint[this.profile.checkPoint] &&
        this.numCheckpoint[this.profile.checkPoint] <= 2
      )
    ) {
      this.checkPointProcessing = true;
      return this.sleep(5)
        .then(() => this.getTypeCheckPoint())
        .then((type) => {
          if (type) {
            if (this.numCheckpoint) {
              if (this.numCheckpoint[type]) {
                ++this.numCheckpoint[type];
              } else {
                this.numCheckpoint[type] = 1;
              }
            } else {
              this.numCheckpoint = {
                [type]: 1
              };
            }
            this.passCheckPoints(type);
            if (
              type !== 'notDefined' &&
              type !== 'moderation' &&
              type !== 'banned' &&
              typeof this[type] !== 'undefined' &&
              this[type] instanceof Function
            ) {
              return this[type]()
                .then(() => this.checkPointHandler())
                .catch((e) => console.log(e));
            }
          }
        }).catch(e => console.log(e));
    } else {
      this.checkPointProcessing = false;
    }
  }


  async getTypeCheckPoint() {

    this.currentAction = 'getTypeCheckPoint';
    this.checkPointDesc = undefined;

    if (this.numCheckpoint) {
      console.log(this.numCheckpoint);
    }

    return new Promise((resolve) => {
      let resolved = false;
      this.testConnect()
        .then(() => this.sleep(5))
        .then(() => this.findClickElement('#pageFooter ul.localeSelectorList li a[title="English (US)"]').catch((e) => console.log(e)))
        .then(() => this.findElement('form.checkpoint div div strong'))
        .then(
          element => element,
          () => this.findElement('form.checkpoint div div div div div div')
        )
        .then(
          element => element.getText(),
          (e) => false
        )
        .then((text) => {
          console.log(text)
          if (text) {
            this.checkPointDesc = text;
            const regExp = {
              start: [/[\s]*для[\s]+входа[\s]+потребуется[\s]+выполнить[\s]+ещё[\s]+несколько[\s]+простых[\s]+действий[\s]*/i],
              phone: [
                /[\s]*укажите[\s]+моб\.[\s]+телефон[\s]*/i,
                /[\s]*enter[\s]+mobile[\s]+number[\s]*/i
              ],
              sms: [
                /[\s]*введите[\s]+код[\s]+для[\s]+входа[\s]*/i,
                /[\s]*enter[\s]+login[\s]+code[\s]*/i
              ],
              photo: [
                /[\s]*загрузите[\s]+свое[\s]+фото[\s]*/i,
                /[\s]*upload[\s]+a[\s]+photo[\s]+of[\s]+yourself[\s]*/i
              ],
              moderation: [
                /[\s]*you[\s]+can't[\s]+use[\s]+facebook[\s]+right[\s]+now[\s]*/i,
                /[\s]*you[\s]+can't[\s]+use[\s]+facebook[\s]+at[\s]+the[\s]+moment[\s]*/i,
                /[\s]*в[\s]+данный[\s]+момент[\s]+вы[\s]+не[\s]+можете[\s]+пользоваться[\s]+facebook[\s]*/i,
                /[\s]*upload[\s]+complete[\s]*/i,
                /[\s]*загрузка[\s]+завершена[\s]*/i
              ],
              banned: [
                /[\s]*предоставьте[\s]+фото[\s]+своего[\s]+удостоверения[\s]+личности[\s]*/i,
                /[\s]*provide[\s]+a[\s]+photo[\s]+of[\s]+your[\s]+id[\s]*/i,
                /[\s]*your[\s]+account[\s]+has[\s]+been[\s]+disabled[\s]*/i,
                /[\s]*ваш[\s]+аккаунт[\s]+заблокирован[\s]*/i
              ]
            };
            for (let key in regExp) {
              if (regExp.hasOwnProperty(key)) {
                if (regExp[key].some(pattern => pattern.test(text))) {
                  resolved = true;
                  resolve(key);
                  break;
                }
              }
            }
          }
        })
        .then(
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('#checkpointSubmitButton[name="submit[Secure Account]"]'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('start');
            }
          },
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('iframe#captcha-recaptcha'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('reCaptcha');
            }
          },
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('[data-captcha-class="TFBCaptcha"]'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('imageCaptcha');
            }
          },
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('input[type="tel"]'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('phone');
            }
          },
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('input.inputtext[type="text"]'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('sms');
            }
          },
          () => {
            if (!resolved) {
              return this.driver.findElement(By.css('input[type="file"]'))
            }
          }
        ).then(
          () => {
            if (!resolved) {
              resolved = true;
              resolve('photo');
            }
          }
        )
        .catch(() => {
          if (!resolved) {
            if (this.profile.checkPoint) {
              resolve(this.profile.checkPoint);
            } else {
              resolve('notDefined')
            }
          }
        });
    });
  }


  passCheckPoints(type) {

    if (
      this.profile.checkPoint &&
      this.profile.checkPoint !== 'notDefined' &&
      this.profile.checkPoint !== type
    ) {
      if (this.profile.passedCheckPoints) {
        this.profile.passedCheckPoints = this.profile.passedCheckPoints.filter(item => item !== type);
        this.profile.passedCheckPoints.push(this.profile.checkPoint);
        // if (this.profile.passedCheckPoints.indexOf(this.profile.checkPoint) === -1) {
        //   this.profile.passedCheckPoints.push(this.profile.checkPoint);
        // }
      } else {
        this.profile.passedCheckPoints = [this.profile.checkPoint];
      }
    }
    this.profile.checkPoint = type;
    this.save();

  }


  async start() {

    this.currentAction = 'start';

    return this.testConnect()
      .then(() => this.sleep(2))
      .then(() => this.findClickElement('#checkpointSubmitButton[name="submit[Secure Account]"]'))
      .catch(e => console.log(e));
  }


  async reCaptcha() {

    this.currentAction = 'reCaptcha';

    return this.testConnect()
      .then(() => this.sleep(2))
      .then(() => this.driver.executeScript('return navigator.userAgent;'))
      .then(v => {
        this.profile.userAgent = v;
        this.save();
      })
      .then(() => this.driver.switchTo().defaultContent())
      .then(() => this.driver.getCurrentUrl())
      .then(v => {
        this.profile.captchaUrl = v;
        this.save();
      })
      .then(() => this.findElement('iframe#captcha-recaptcha'))
      .then((recaptchaFrame) => this.driver.wait(until.ableToSwitchToFrame(recaptchaFrame), this.waitingTime))
      .then(() => this.findElement('div.g-recaptcha'))
      .then((element) => element.getAttribute('data-sitekey'))
      .then(v => {
        console.log(v);
        if (siteKey[v.trim()]) {
          this.profile.captchaUrl = siteKey[v.trim()];
        }
        this.profile.captchaSiteKey = v;
        this.save();
      })
      .then(() => createReCaptchaTask(this.id))
      .then((taskId) => {
        console.log('createReCaptchaTask');
        if (taskId) {
          console.log('ReCaptcha taskId', taskId);
          this.profile.captchaTaskId = taskId;
          this.save();
        } else {
          throw new Error('Error to create reCaptcha task!');
        }
      })
      .then(() => {
        if (this.profile.captchaTaskId) {
          let counter = 0;
          return new Promise((resolve, reject) => {
            const loop = () => {
              counter++;
              getReCaptchaTaskResult(this.profile.captchaTaskId)
                .then((response) => {
                  console.log(response);
                  if (
                    response &&
                    response.hasOwnProperty('errorId') &&
                    +response.errorId === 0 &&
                    response.status
                  ) {
                    if (
                      response.status === 'ready' &&
                      response.solution &&
                      response.solution.gRecaptchaResponse
                    ) {
                      this.profile.reCaptchaResponse = response.solution.gRecaptchaResponse;
                      this.save();
                      resolve();
                    } else if (response.status === 'processing' && counter < 10) {
                      this.sleep(10)
                        .then(() => loop());
                    } else {
                      this.driver.switchTo().defaultContent()
                        .then(() => reject())
                        .catch(() => reject());
                    }
                  } else {
                    let error = 'no errors';
                    if (response && response.errorDescription) {
                      error = response.errorDescription;
                    }
                    this.driver.switchTo().defaultContent()
                      .then(() => reject(error))
                      .catch(() => reject(error));
                  }
                });
            };
            loop();
          });
        } else {
          throw new Error('Not found anti-captcha taskId');
        }
      })
      .then(() => this.driver.executeScript(`document.querySelector('textarea#g-recaptcha-response').innerHTML='${this.profile.reCaptchaResponse}'`))
      .then(() => this.driver.switchTo().defaultContent())
      .then(() => this.driver.executeScript(`document.querySelector('input#captcha_response').value='${this.profile.reCaptchaResponse}'`))
      .then(() => this.findClickElement('button#checkpointSubmitButton'))
      .catch((e) => this.error(e));
  }


  async imageCaptcha() {

    this.currentAction = 'imageCaptcha';

    return this.testConnect()
      .then(() => this.sleep(1))
      .then(() => this.driver.takeScreenshot())
      .then((screenshot) => createImageCaptchaTask(screenshot))
      .then((taskId) => {
        console.log('createImageCaptchaTask');
        if (taskId) {
          console.log('taskId', taskId);
          this.profile.captchaTaskId = taskId;
          this.save();
        }
      })
      .then(() => {
        if (this.profile.captchaTaskId) {
          let counter = 0;
          return new Promise((resolve, reject) => {
            const loop = () => {
              counter++;
              getImageCaptchaTaskResult(this.profile.captchaTaskId)
                .then((response) => {
                  console.log(response);
                  if (
                    response &&
                    response.hasOwnProperty('errorId') &&
                    +response.errorId === 0 &&
                    response.status
                  ) {
                    if (
                      response.status === 'ready' &&
                      response.solution &&
                      response.solution.text
                    ) {
                      this.profile.captchaSolution = response.solution.text;
                      this.save();
                      resolve(this.profile.captchaSolution);
                    } else if (response.status === 'processing' && counter < 10) {
                      this.sleep(10)
                        .then(() => loop());
                    } else {
                      reject('Unknown error');
                    }
                  } else {
                    let error = 'Unknown error';
                    if (response && response.errorDescription) {
                      error = response.errorDescription;
                    }
                    reject(error);
                  }
                });
            };
            loop();
          });
        } else {
          throw 'Not found anti-captcha taskId';
        }
      })
      .then((solution) => this.findSendKeys('#captcha_response', solution))
      .then(() => this.findClickElement('#checkpointSubmitButton'))
      .catch((e) => this.error(e));
  }


  async phone() {

    this.currentAction = 'phone';

    return this.testConnect()
      .then(() => this.sleep(2))
      .then(() => this.findClickElement('form.checkpoint .uiPopover a[rel="toggle"]'))
      .then(element => element.getAttribute('id'))
      .then(id => this.findElements(`[data-ownerid="${id}"] ul li a span span`))
      .then((countries) => new Promise((resolve, reject) => {
        if (countries && countries.length) {
          (function loop(i) {
            if (i < countries.length) {
              countries[i].getText()
                .then((country) => {
                  if (
                    country &&
                    typeof country === 'string' &&
                    /\([\+]{0,1}7[\+]{0,1}\)/.test(country.trim())
                    // (country.trim() === 'Россия (+7)' || country.trim() === 'Russia (+7)' || /\([\+]{0,1}7[\+]{0,1}\)/.test(country.trim()))
                  ) {
                    countries[i].click()
                      .then(() => resolve())
                      .catch(() => reject());
                  } else {
                    loop(++i);
                  }
                })
                .catch((e) => {
                  console.log(e);
                  reject()
                });
            } else {
              console.log('error select country');
              reject();
            }
          })(0);
        } else {
          console.log('error select country');
          reject();
        }
      }))
      .then(() => getPhoneNumber())
      .then(phone => {
        if (phone && phone.number && phone.id) {
          this.profile.phone = phone;
          this.save();
          return phone.number
        } else {
          return false;
        }
      })
      .then((phone) => {
        if (phone) {
          return this.findSendKeys('input[type="tel"]', phone);
        } else {
          throw 'Error to get phone';
        }
      })
      .then(() => this.findClickElement('button#checkpointSubmitButton'))
      .catch((e) => this.error(e));

  }


  async sms() {

    this.currentAction = 'sms';

    return this.testConnect()
      .then(() => this.sleep(1))
      .then(() => {
        if (
          this.profile.phone &&
          this.profile.phone.number &&
          this.profile.phone.id
        ) {
          return getSmsCode(this.profile.phone.id)
            .then((code) => {
              if (code) {
                if (code === 'sms') {
                  return this.findClickElement('.uiLinkButtonInput')
                    .then(() => getSmsCode(this.profile.phone.id, 'ru', true));
                } else {
                  return code;
                }
              } else {
                return false;
                // throw 'Code not received'
              }
            })

        }
      })
      .then((code) => {
        if (code) {
          return this.findSendKeys('input.inputtext[type="text"]', code);
        } else {
          return this.findClickElement('#checkpointSecondaryButton')
            .then(() => { throw 'Code not received'; })
        }
      })
      .then(() => this.findClickElement('#checkpointSubmitButton'))
      .catch((e) => this.error(e));

  }


  async photo() {

    this.currentAction = 'photo';

    return this.downloadPhoto()
      .then(() => this.testConnect())
      .then(() => this.findElement('input[type="file"]'))
      .then((uploadField) => uploadField.sendKeys(path.join(__dirname, '../public/photo', this.profile.fbPhoto)))
      .then(() => this.sleep(10))
      .then(() => this.findClickElement('#checkpointSubmitButton'))
      .then(() => this.sleep(15))
      // .then(() => this.findClickElement('#checkpointSubmitButton'))
      .catch((e) => { throw e; });
  }

}

module.exports = AccountHandler;
