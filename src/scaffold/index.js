const path = require('path');

const sourceJsFile = path.join(__dirname, 'templates/index.source.js');
const targetJsFile = path.join(__dirname, 'templates/index.target.js');

const sourceScssFile = path.join(__dirname, 'templates/organisms.source.scss');
const targetScssFile = path.join(__dirname, 'templates/organisms.target.scss');

const sourceScssFile2 = path.join(__dirname, 'templates/_access.source.scss');
const targetScssFile2 = path.join(__dirname, 'templates/_access.target.scss');




// usage
// 1. 把scss 的selector 按照字母排序
const fs = require('fs');
// const {sourceScssFile2, targetScssFile2} = require('./constants');

const {scssAlphabetical} = require('./utils');

const scssContent = fs.readFileSync(sourceScssFile2, 'utf8');
const scss = scssAlphabetical(scssContent)
fs.writeFileSync(targetScssFile2, scss);


// // usage
// // 2. 按照字母排序来引入依赖
// const fs = require('fs');
// const {sourceScssFile, targetScssFile} = require('./constants');
// const {scssImportsAlphabetical} = require('./utils');

// const scssContent = fs.readFileSync(sourceScssFile, 'utf8');
// const importModule = './aacdBbb-ccc';
// const scss = scssImportsAlphabetical(scssContent, importModule)
// fs.writeFileSync(targetScssFile, scss);