// const path = require('path');

// const sourceJsFile = path.join(__dirname, 'templates/index.source.js');
// const targetJsFile = path.join(__dirname, 'templates/index.target.js');

// const sourceScssFile = path.join(__dirname, 'templates/organisms.source.scss');
// const targetScssFile = path.join(__dirname, 'templates/organisms.target.scss');

// const sourceScssFile2 = path.join(__dirname, 'templates/_access.source.scss');
// const targetScssFile2 = path.join(__dirname, 'templates/_access.target.scss');

// module.exports = {
//     sourceJsFile,
//     targetJsFile,

//     sourceScssFile,
//     targetScssFile,

//     sourceScssFile2,
//     targetScssFile2,
// }


const os = require('os');
const path = require('path');
const {execSync} = require("child_process");
const _ = require('lodash');

const {scssImportsAlphabetical, vueImportsAlphabetical, mockDataImportsAlphabetical, storeImportsAlphabetical} = require('./utils');
const {readFile, writeFile, makeDirDashP} = require('../utils');

const executeCommand = (
    command,
    options
) => {
    try {
        const stdout = execSync(command, options);
        return (typeof stdout === 'string' ? stdout : stdout.toString()).trim();
    } catch (e) {
        const errorMessage = `command: '${command}'. error: '${e.message}'`;
        throw Error(errorMessage);
    }
};

const getPaths = function () {
    const cwd = process.cwd()
    // console.log('🔥cwd💥 ', cwd); // C:\Users\cn4095\Desktop\tmp

    const home = os.homedir();
    // console.log('🔥home💥 ', home);

    // console.log('🔥__filename💥 ', __filename);
    // const __dirname = path.dirname(__filename);
    // console.log('🔥__dirname💥 ', __dirname);

    const pathResolve = path.resolve();
    // console.log('🔥path.resolve()💥 ', pathResolve);

    const base = path.basename(path.resolve());
    // console.log('🔥base💥 ', base); // tmp

    return {cwd, home, filePath: __filename, dirPath: __dirname, pathResolve, base};
}

const scopeMapScopeNum = {
    atoms: '00-atoms',
    molecules: '01-molecules',
    organisms: '02-organisms',
    pages: '03-pages',
};
const supportScopeList = Object.keys(scopeMapScopeNum);
const handleInputsParams = (inputs) => {
    // eg: inputScope -> 'atoms'   inputModulePath -> 'mela/mela-cart';
    const {inputScope, inputModulePath} = inputs;

    const scopeFirstLetter = inputScope.slice(0, 1); // a
    const scopeFirstLetterUpperCase = _.toUpper(scopeFirstLetter); // A
    const scopeWithNum = scopeMapScopeNum[inputScope]; // 00-atoms

    let inputModulePathSplit = inputModulePath.split('/');
    if (inputModulePathSplit.length === 1) {
        inputModulePathSplit = [inputModulePath, inputModulePath]
    }
    // inputModulePathSplit = inputModulePathSplit.slice(0, 2);

    // const moduleName = inputModulePathSplit[1]; // mela-cart
    const moduleName = inputModulePathSplit[inputModulePathSplit.length - 1]; // mela-cart
    const moduleNameCamelCase = _.camelCase(moduleName); // melaCart
    const moduleNameUpperCase = _.upperFirst(moduleNameCamelCase); // MelaCart
    const TYPE1 = `${scopeFirstLetter}-${moduleName}`; // a-mela-cart
    const TYPE2 = `${scopeFirstLetter}-${moduleNameCamelCase}`; // a-melaCart
    const TYPE3 = moduleName; // mela-cart
    const TYPE4 = moduleNameUpperCase; // MelaCart
    const TYPE5 = `${scopeFirstLetterUpperCase}${moduleNameUpperCase}`; // MelaCart
    const TYPE6 = moduleNameCamelCase; // MelaCart
    return {
        inputScope,
        inputModulePath,
        scopeWithNum,
        moduleName,
        moduleNameCamelCase,
        moduleNameUpperCase,
        TYPE1,
        TYPE2,
        TYPE3,
        TYPE4,
        TYPE5,
        TYPE6,
    };
}

const templatesDir = 'templates/component';
const supportProjectList = ['productstore', 'magazines', 'riverbend', 'marketplace', 'dsibo'];
const defaultProjectName = 'productstore';
// const getGitCommonDirPathCommand = "git rev-parse --absolute-git-dir";
const getBasicInfos = (payload, genType = '') => {
    const paths = getPaths();
    // const pwd = `~/Documents/code-repo/DEP-Phase1/fe-library/productstore/aaa\\bbb`;
    const {cwd} = paths;

    // // const repoBasePath = `~/Documents/code-repo/DEP-Phase1/`;
    // const repoDotGitPath = executeCommand('git rev-parse --absolute-git-dir', cwd);
    // const repoBasePath = path.join(repoDotGitPath, '..');
    // const projectName = cwd.split(/\/|\\/).find(i => supportProjectList.includes(i)) || defaultProjectName;
    // const projectBasePath = path.join(repoBasePath, 'fe-library', projectName);
    // ---
    const supportProjectList_reg = supportProjectList.map(item => new RegExp(`fe-library[\\\\/]+${item}`));
    const regIndex = supportProjectList_reg.findIndex(reg => reg.test(cwd));
    if (regIndex < 0) {
        console.error('🚨 Please cd to an valid project path');
        process.exit(1);
    }
    const projectName = supportProjectList[regIndex];
    const projectFeReg = supportProjectList_reg[regIndex];
    const projectFeStart = cwd.search(projectFeReg);
    // const projectName = supportProjectList.find(item => `${item}`);
    const repoBasePath = cwd.slice(0, projectFeStart);
    const projectBasePath = path.join(repoBasePath, 'fe-library', projectName);

    let inputs = {};
    if (genType === 'component') {
        inputs = handleInputsParams(payload);
    } else if (genType === 'api') {
        inputs = handleInputsParams__api(payload, projectName);
    } else if (genType === 'store') {
        inputs = handleInputsParams__store(payload);
    }
    return {
        ...payload,
        ...paths,
        ...inputs,
        repoBasePath,
        projectName,
        projectBasePath,
    }
};

function writeFileEnhance(filename, content) {
    const fileDir = path.dirname(filename);
    makeDirDashP(fileDir);
    writeFile(filename, content);
}
function replacePlaceholder(text, payload) {
    return text.replace(/\{\s*TYPE(\d+)\s*}/mg, function (match, $1) {
        return payload['TYPE' + $1];
    });
}
const generateComponent = (payload) => {
    const {
        isHtmlNotVue = false,
        moduleName,
        inputScope,
        scopeWithNum,
        projectBasePath,
        inputModulePath,
        moduleNameUpperCase,
        // TYPE1,
        // TYPE2,
        // TYPE3,
        // TYPE4,
    } = payload;

    // 1.1 hbs
    const sourcePath = isHtmlNotVue
        ? path.join(__dirname, templatesDir, 'html.hbs')
        : path.join(__dirname, templatesDir, 'vue.hbs');
    const destPath = path.join(projectBasePath, `source/_patterns/${inputScope}/${inputModulePath}.hbs`);
    let code = readFile(sourcePath);
    code = replacePlaceholder(code, payload);
    writeFileEnhance(destPath, code);

    // 1.2 json
    const sourcePathJson = isHtmlNotVue
        ? path.join(__dirname, templatesDir, 'html.json')
        : path.join(__dirname, templatesDir, 'vue.json');
    const destPathJson = path.join(projectBasePath, `source/_patterns/${inputScope}/${inputModulePath}.json`);
    let codeJson = readFile(sourcePathJson);
    codeJson = replacePlaceholder(codeJson, payload);
    writeFileEnhance(destPathJson, codeJson);

    if (!isHtmlNotVue) {
        // 2.1 vue
        const sourcePathVue = path.join(__dirname, templatesDir, 'vue.vue');
        const destPathVue = path.join(projectBasePath, `source/js/vue/components/${scopeWithNum}/${inputModulePath}.vue`);
        let codeVue = readFile(sourcePathVue);
        codeVue = replacePlaceholder(codeVue, payload);
        writeFileEnhance(destPathVue, codeVue);

        // 2.2 vue scope index
        const destPathVueScopeIndex = path.join(projectBasePath, `source/js/vue/components/index.js`);
        const vueScopeIndexContent = readFile(destPathVueScopeIndex, 'utf8');
        // const importModule = `import zzzTimeLineCard from './00-molecules/timeline-card/timeline-card.vue';`;
        // const importModule = `import AccessLink111 from './00-atoms/access-link/access-link.vue';`;
        // const importModule = `import aaaTimeLineCard from './01-molecules/timeline-card/timeline-card.vue';`;
        // const importModule = `import bbbTimeLineCard from './01-molecules/timeline-card/timeline-card.vue';`;
        // const importModule = `import zzzTimeLineCard from './01-molecules/timeline-card/timeline-card.vue';`;

        // const exportModule = `aaaTimeLineCard`;
        // const exportModule = `bbbTimeLineCard`;
        // const exportModule = `zzzTimeLineCard`;

        const importModule = `import ${moduleNameUpperCase} from './${scopeWithNum}/${inputModulePath}.vue';`;
        const exportModule = moduleNameUpperCase;
        const vueScopeIndexContentTransfered = vueImportsAlphabetical(vueScopeIndexContent, importModule, exportModule)
        writeFile(destPathVueScopeIndex, vueScopeIndexContentTransfered);
    }

    // 3.1 scss
    const sourcePathScss = path.join(__dirname, templatesDir, 'style.scss');
    const destPathScss = path.join(projectBasePath, `source/scss/build/${inputScope}/_${moduleName}.scss`);
    let codeScss = readFile(sourcePathScss);
    codeScss = replacePlaceholder(codeScss, payload);
    writeFileEnhance(destPathScss, codeScss);

    // 3.2 scss scope index
    const destPathScssScopeIndex = path.join(projectBasePath, `source/scss/build/${inputScope}/${inputScope}.scss`);
    const scssScopeIndexContent = readFile(destPathScssScopeIndex, 'utf8');
    const importModule = `./${moduleName}`;
    const scssScopeIndexContentTransfered = scssImportsAlphabetical(scssScopeIndexContent, importModule)
    writeFile(destPathScssScopeIndex, scssScopeIndexContentTransfered);

    // return {sourcePath, destPath}
};

const apiPathWithProjectName_projectList = supportProjectList.filter(i => i!== 'productstore');
function handleInputsParams__api(inputs, projectName) {
    const {inputApiPath, requestMethod} = inputs;
    // magazine/mela-api/mela-cart
    const filePath = apiPathWithProjectName_projectList.includes(projectName)
        ? `${projectName}/${inputApiPath}`
        : inputApiPath;
    const inputApiPathSplit = inputApiPath.split('/');
    const apiName = inputApiPathSplit[inputApiPathSplit.length - 1]; // mela-cart
    const filePathSplit = filePath.split('/');
    const moduleName = _.camelCase(filePathSplit.join('-'));
    const apiNameCamelCase = _.camelCase(apiName); // melaCart

    const TYPE1 = inputApiPath;
    const TYPE2 = apiNameCamelCase;
    const TYPE3 = requestMethod;
    return {
        ...inputs,
        filePath,
        moduleName,
        TYPE1,
        TYPE2,
        TYPE3,
    };
}

const templatesDirApi = `templates/api`;
function generateApi(payload) {
    const {
        inputApiPath,
        filePath,
        moduleName,
        repoBasePath,
    } = payload;

    // route.js
    const sourcePath = path.join(__dirname, templatesDirApi, 'route.js');
    const destPath = path.join(repoBasePath, `fe-library/api/routes/${filePath}/index.js`);
    let code = readFile(sourcePath);
    code = replacePlaceholder(code, payload);
    writeFileEnhance(destPath, code);

    // mockData.js
    const sourcePathMockData = path.join(__dirname, templatesDirApi, 'mockData.js');
    const destPathMockData = path.join(repoBasePath, `fe-library/api/_mock-data/${filePath}/index.js`);
    let codeMockData = readFile(sourcePathMockData);
    codeMockData = replacePlaceholder(codeMockData, payload);
    writeFileEnhance(destPathMockData, codeMockData);

    // mockData.js
    const sourcePathMockDataData = path.join(__dirname, templatesDirApi, '_data.json');
    const destPathMockDataData = path.join(repoBasePath, `fe-library/api/_mock-data/${filePath}/_data.json`);
    let codeMockDataData = readFile(sourcePathMockDataData);
    codeMockDataData = replacePlaceholder(codeMockDataData, payload);
    writeFileEnhance(destPathMockDataData, codeMockDataData);

    // mockData.js
    const sourcePathMockDataError = path.join(__dirname, templatesDirApi, '_error.json');
    const destPathMockDataError = path.join(repoBasePath, `fe-library/api/_mock-data/${filePath}/_error.json`);
    let codeMockDataError = readFile(sourcePathMockDataError);
    codeMockDataError = replacePlaceholder(codeMockDataError, payload);
    writeFileEnhance(destPathMockDataError, codeMockDataError);

    const destPathApiMockDataIndex = path.join(repoBasePath, `fe-library/api/_mock-data/data.js`);
    const mockDataScopeIndexContent = readFile(destPathApiMockDataIndex, 'utf8');
    const importModule = `import ${moduleName} from './${filePath}';`;
    const exportModule = moduleName;
    const mockDataScopeIndexContentTransfered = mockDataImportsAlphabetical(mockDataScopeIndexContent, importModule, exportModule)
    writeFile(destPathApiMockDataIndex, mockDataScopeIndexContentTransfered);
}








function handleInputsParams__store(inputs) {
    const {inputStorePath} = inputs;
    // mela-cart
    const storeNameCamelCase = _.camelCase(inputStorePath); // melaCart

    return {
        ...inputs,
        storeNameCamelCase,
    };
}

const templatesDirStore = `templates/store`;
function generateStore(payload) {
    const {
        inputStorePath,
        storeNameCamelCase,
        projectBasePath,
    } = payload;

    // route.js
    const sourcePath = path.join(__dirname, templatesDirStore, 'store.js');
    const destPath = path.join(projectBasePath, `source/js/vue/stores/modules/${inputStorePath}.js`);
    let code = readFile(sourcePath);
    code = replacePlaceholder(code, payload);
    writeFileEnhance(destPath, code);

    const destPathStoreIndex = path.join(projectBasePath, `source/js/vue/stores/index.js`);
    const indexContent = readFile(destPathStoreIndex, 'utf8');
    const importModule = `import ${storeNameCamelCase} from './modules/${inputStorePath}';`;
    const exportModule = storeNameCamelCase;
    const indexContentTransfered = storeImportsAlphabetical(indexContent, importModule, exportModule)
    writeFile(destPathStoreIndex, indexContentTransfered);
}
module.exports = {
    getPaths,
    getBasicInfos,
    supportScopeList,
    supportProjectList,

    generateComponent,
    generateApi,
    generateStore,

};
