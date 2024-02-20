const path = require('path');
const {copyFileSync, constants} = require('fs');
const { execSync } = require('child_process');
const {
    blue,
    green,
    red,
    reset,
    yellow
} = require('kolorist');
const prompts = require('prompts');
const {configDirPath, configFilePath, templateConfigFile, tasksScript} = require('./constants');
const {
    isFile, isDirectory, makeDirDashP, readJsonFile,
    logInfo, logWarn, logError,
    spawnPromise, isWin,
    getAbsPathOfGivenAbsPath,
} = require('../utils');

// check if has config file
function checkConfigFile() {
    if (!isFile(configFilePath)) {
        makeDirDashP(configDirPath);

        copyFileSync(templateConfigFile, configFilePath, constants.COPYFILE_EXCL);
        logInfo(`${templateConfigFile} was copied to ${yellow(configFilePath)}, plz do config it first.`);
        logInfo(`Exec \`code ${yellow(configFilePath)}\` in terminal to edit it.`);
        process.exit(0);
    }
}

// chech if has avilable item in config file
function getConfigInfo() {
    try {
        const configData = readJsonFile(configFilePath);
        const projects = Object.keys(configData)
        if (!projects.length) {
            logError(`You have not config any confit yet, plz config first (\`code ${configFilePath}\`)`);
            process.exit(1);
        }
        return {projects, configData};
    } catch (error) {
        logError(`Your config file format is'nt correct (\`code ${configFilePath}\`)`);
        process.exit(1);
    }
}

// choose the project you want
async function chooseProject(payload) {
    const {projects, configData} = payload;
    const colorList = [green, yellow, red];
    const chooseProjectList = projects.map((project, index) => {
        return {
            title: colorList[index % colorList.length](project),
            value: project,
        }
    });
    try {
        return await prompts(
            [
                {
                    type: 'select',
                    name: 'choosedProject',
                    message: reset('Please choose project：'),
                    choices: chooseProjectList
                },
            ],
            {
                onCancel: () => {
                    throw new Error(red('✖') + ' Operation cancelled')
                },
            },
      );
    } catch (cancelled) {
        logError(cancelled.message)
        process.exit(0);
    }
}

function checkProjectConfig(projectConfig) {
    const {projectPath} = projectConfig;
    if (!isDirectory(projectPath)) {
        logError(`Project path ${projectPath} is not a valid directory, plz check!`)
        process.exit(1);
    }
    if (!path.isAbsolute(projectPath)) {
        logError(`Project path ${projectPath} is not an absolute directory, plz check!`)
        process.exit(1);
    }
}

function checkNodeVersion(payload) {
    const {nodeMajorVersionExpect, nodeVersion} = payload;
    let nmve = nodeMajorVersionExpect?.trim();
    if (nmve) {
        nmve = nmve.replace(/\s/g, '')
        // valid `>=13&&<=14||=10` `=14` `=14&&=13` `=14&&=13&&=12` `>=13&&<=14||=10` ` =13 && <=14 ||==10 ` `=14&&=13||==10 && >=20 | | =1`
        // invalid `=` `14` `=14&=13` `||`
        if (!/^((?:=|==|===|>|>=|<|<=)\d+)(?:(?:&&|\|\|)((?:=|==|===|>|>=|<|<=)\d+))*$/.test(nmve)) {
            logError(`Unsopport param nodeMajorVersionExpect (${nodeMajorVersionExpect})`);
            process.exit(1);
        }
        const reResult = /^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/.exec(nodeVersion);
        const majorVersion = reResult?.groups?.major;
        nmve = nmve.replace(/(&&|\|\|)=(\d+)/g, '$1===$2').replace(/^=(\d+)/, '===$1');
        nmve = majorVersion + nmve.replace(/(&&|\|\|)/g, `$1${majorVersion}`);
        const assertExpectNodeVersion = eval(nmve);
        if (!assertExpectNodeVersion) {
            logError(`Your node version ${nodeVersion} is not as expected (${nodeMajorVersionExpect})`);
            process.exit(1);
        }
    }
}

async function runDeamonTasks(choosedProjectData, project) {
    const {projectPath, nodemon = {}} = choosedProjectData;
    // nodemon tasks.js
    const ext = nodemon?.ext ? ['-e', nodemon?.ext] : [];
    const watch = nodemon?.watch
        ? [].concat(...nodemon?.watch.map(w => (['--watch', getAbsPathOfGivenAbsPath(w, projectPath)])))
        : [];
    const ignore = nodemon?.ignore
        ? [].concat(...nodemon?.ignore.map(i => (['--ignore', getAbsPathOfGivenAbsPath(i, projectPath)])))
        : [];
    await spawnPromise(
        isWin ? 'npx.cmd' : 'npx',
        [
            'nodemon',
            ...ext,
            ...watch,
            ...ignore,
            tasksScript,
            // JSON.stringify(choosedProjectData) // not compatible with windows well
            project
        ]
    );


    // const nodemon = require('nodemon');

    // const {projectPath} = choosedProjectData;
    // console.log('🔥projectPath💥 ', projectPath);
    // nodemon({
    //     script: tasksScript,
    //     // ext: 'js json vue',
    //     watch: [projectPath],
    //     ignore: [path.join(projectPath, 'public')],
    // });

    // nodemon.on('start', function () {
    //     console.log('App has started');
    // }).on('quit', function () {
    //     console.log('App has quit');
    //     process.exit();
    // }).on('restart', function (files) {
    //     console.log('App restarted due to: ', files);
    // });
}

async function start() {
    checkConfigFile();
    const {projects, configData} = getConfigInfo();
    const result = await chooseProject({projects, configData});
    const project = result.choosedProject;
    const choosedProjectData = configData[project];
    const {projectPath, nodeMajorVersionExpect} = choosedProjectData;

    const nodeVersion = execSync('node -v').toString().trim();
    console.group('Your env infos:');
    console.log(`Your node verions is: ${nodeVersion}`);
    console.log(`Your project path is: ${projectPath}`);
    console.groupEnd();

    checkProjectConfig(choosedProjectData);
    checkNodeVersion({nodeMajorVersionExpect, nodeVersion});

    await runDeamonTasks(choosedProjectData, project);
}

start().then(() => {
    console.log('🔥staring💥 ');
}).catch((error) => {
    console.log('🔥exit error💥 ', error);
})
