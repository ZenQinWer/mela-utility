const path = require('path');
const fs = require('fs');
const {
    getPaths,
} = require('./constants');

const { logError, isFile } = require('../utils');

// usage: `mela-sss source/scss/build/atoms/_anchor-button.scss`


const yourPathArr = process.argv.slice(2,3);
if (!yourPathArr.length) {
    logError('Plz input your path');
    process.exit(1);
}
const yourPath = yourPathArr[0];

const fullPath = path.join(getPaths().cwd, yourPath);
if (!isFile(fullPath)) {
    logError(`${yourPath} is not a file`);
    process.exit(1);
}

const {scssAlphabetical} = require('./utils');

const scssContent = fs.readFileSync(yourPath, 'utf8');
const scss = scssAlphabetical(scssContent)
fs.writeFileSync(yourPath, scss);
