const prompts = require('prompts');
const {
    getBasicInfos,
    generateApi,
} = require('./constants');

const { logError } = require('../utils');
// const inputScope = 'atoms';

// // const inputModulePath = 'melaCart';
// const inputModulePath = 'mela-comp/mela-cart';


// usage
// 10:52:39 PM in ~/Documents/com.melaleuca/mela-fe.siteCore-vue/fe-library/magazines on  feature/fe/sz/magazines---for-9.1.5 [secondary/feature/fe/sz/magazines---for-9.1.5 ] [$?] is 📦 v0.0.1 via ⬢ v14.21.3 
//  cd ~/Documents/com.melaleuca/mela-fe.siteCore-vue/fe-library/magazines 

// 10:53:13 PM in ~/Documents/com.melaleuca/mela-fe.siteCore-vue/fe-library/magazines on  feature/fe/sz/magazines---for-9.1.5 [secondary/feature/fe/sz/magazines---for-9.1.5 ] [$?] is 📦 v0.0.1 via ⬢ v14.21.3 
//  node ~/Desktop/projects/mela-utility/src/scaffold/index.js 

async function setParams() {
    const methods = ['Get', 'Post', 'Put'].map((method) => {
        return {
            title: method,
            value: method,
        }
    });
    try {
        return await prompts(
            [
                {
                    type: 'text',
                    name: 'inputApiPath',
                    message: 'Please type your module path: '
                },
                {
                    type: 'select',
                    name: 'requestMethod',
                    message: 'Please choose requestMethod: ',
                    choices: methods
                },
            ],
            {
                onCancel: () => {
                    throw new Error('✖ Operation cancelled')
                },
            },
      );
    } catch (cancelled) {
        logError(cancelled.message)
        process.exit(0);
    }
}

async function init() {
    const {inputApiPath, requestMethod} = await setParams();
    if (!inputApiPath) {
        logError('Parames is required!');
        process.exit(1);
    }
    const basicInfos = getBasicInfos({
        inputApiPath,
        requestMethod,
    }, 'api');

    generateApi(basicInfos);
}
init()
    .then()

// generate hbs (`html component` OR `vue component`)

// generate vue (auto import)
// generate scss (auto import)
