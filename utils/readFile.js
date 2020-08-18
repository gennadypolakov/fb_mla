const fs = require('fs');
const lineReader = require('readline');

exports.fileToArray = function (filePath) {
  let array = [];

  lineReader.createInterface({
    input: fs.createReadStream(filePath)
  });

  lineReader.on('line', line => {

    array.push(line);
    console.log(array);
  });
  return array;
};
