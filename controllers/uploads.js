const { arrayToFile, fileToArray } = require('../utils');

function dataHandler(files, type, proxyType = false) {

  let result = [];

  if(type === 'proxy' || type === 'accounts'){

    let oldData = fileToArray(type + '.txt');

    files.forEach((item, id) => {

      const pattern = {
        proxy: /^[^:]+:[^:@]+@[^:@]+:\d+$/i,
        accounts: /^[^;]+;[^;]+$/i
      };

      const fileData = fileToArray(`../${item.path}`);
      result[id] = {
        name: item.originalname,
        data: [],
        ok: 0,
        error: 0
      };
      fileData.forEach((data) => {
        if (pattern[type].test(data) && oldData.indexOf(`${data}${proxyType ? `|${proxyType}` : ''}`) === -1) {
          result[id].data.push(`${data}${proxyType ? `|${proxyType}` : ''}`);
          result[id].ok++;
        } else {
          result[id].error++;
        }
      });
      if (result[id].data.length > 0) {
        arrayToFile(type + '.txt',
          [
            ...fileToArray(type + '.txt'),
            ...result[id].data
          ]
        )
      }
      delete result[id].data;
    });
  }

  return result;

}

module.exports = { dataHandler };
