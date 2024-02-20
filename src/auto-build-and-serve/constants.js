const os = require('os');
const path = require('path');

const home = os.homedir();
const configDirPath = path.join(home, '.mela/');
const configFilePath = path.join(configDirPath, 'abas.config.json');

const templateConfigFile = path.join(__dirname, 'template.abas.config.json');
const tasksScript = path.join(__dirname, 'tasks.js');

module.exports = {
    home,
    configDirPath,
    configFilePath,
    tasksScript,
    templateConfigFile,
}
