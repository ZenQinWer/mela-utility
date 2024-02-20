const path = require('path');
const liveServer = require("live-server");
const {configFilePath} = require('./constants');
const {execCmdOneByOne, spawnPromise, isDirectory, isFile, streamMergeMain, readJsonFile, getAbsPathOfGivenAbsPath, portIsUsed, logWarn, writeFile, logInfo} = require("../utils");
const { bgLightYellow } = require('kolorist');

const firstVariable = process.argv[2];
if (!firstVariable) {
    process.exit(1);
}
const project = firstVariable;
const configData = readJsonFile(configFilePath);
const config = configData[project];
const {projectPath} = config;

function doPreCheck() {
    if (!isDirectory(projectPath)) {
        console.log(`🔥Project path ${projectPath} not exsit , plz check💥 `);
        process.exit(1)
    }
}

async function doBuild() {
    const {projectPath, build = {}} = config;
    const {cmd = "", params = [], cwd = "."} = build;
    const retCode = await spawnPromise(cmd, params, {
        cwd: getAbsPathOfGivenAbsPath(cwd, projectPath),
    });
    if (retCode !== 0) {
        throw new Error('Do build failed');
    }
}

function getPredictJsUrl(host, port, pathname) {
    return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/${pathname.replace(/\\/g, '/')}`
}

async function doBundle() {
    const {projectPath, bundle: {useOriginSource = false, bundleMap = null } } = config;
    if (useOriginSource) {
        const {liveServer: liveServerOptions = {} } = config;
        const liveServerRoot = getAbsPathOfGivenAbsPath(liveServerOptions.root, projectPath);
        const liveServerHost = liveServerOptions.host || "0.0.0.0";
        const liveServerPort = liveServerOptions.port;
        const importOriginJsListStr = `
            function addScript(url) {
                document.write('<script language=javascript src=' + url + '></script>');
            }

        `;
        const timeTag = new Date().toLocaleString();
        const versionLogScript = `console.log("%c [Use sourcemap!]Time version is ${timeTag}. ", "background-color:purple; color:white; border-radius: 2px;");`;
        for (const [bundleFile, sourceFileList] of Object.entries(bundleMap)) {
            console.log('🔥bundleFile, sourceFileList - 1 - use sourcemap💥 ', bundleFile, sourceFileList);
            const originFilePaths = sourceFileList
                .filter(i => {
                    const isFileExist = isFile(getAbsPathOfGivenAbsPath(i, projectPath));
                    if (!isFileExist) {
                        logWarn(`Script file ${i} doen't exist. delete it from origin.`);
                    } else {
                        logInfo(`Script file ${i} exist.`)
                    }
                    return isFileExist
                })
                .map(i => path.relative(liveServerRoot, getAbsPathOfGivenAbsPath(i, projectPath)));
            const originScripts = originFilePaths.map(i => (
                getPredictJsUrl(liveServerHost, liveServerPort, i)
            ));
            const originScriptsUrl = originScripts.map(i => {
                return `addScript('${i}');`;
            });
            const bundleContent = importOriginJsListStr + '\n\n' + versionLogScript + '\n' + originScriptsUrl.join('\n') + '\n';
            writeFile(getAbsPathOfGivenAbsPath(bundleFile, projectPath), bundleContent);
        }
    } else if (bundleMap) {
        for (const [bundleFile, sourceFileList] of Object.entries(bundleMap)) {
            console.log('🔥bundleFile, sourceFileList - 2💥 ', bundleFile, sourceFileList);
            await streamMergeMain(sourceFileList.map(p => {
                return getAbsPathOfGivenAbsPath(p, projectPath);
            }), getAbsPathOfGivenAbsPath(bundleFile, projectPath))
        }
    }
}

async function doRestartServer() {
    const {projectPath, liveServer: liveServerOptions = {}, bundle: { bundleMap = null }} = config;
    const liveServerRoot = getAbsPathOfGivenAbsPath(liveServerOptions.root, projectPath);
    const liveServerHost = liveServerOptions.host || "0.0.0.0";
    const liveServerPort = liveServerOptions.port;
    if (bundleMap) {
        const bundleFilePaths = Object
            .keys(bundleMap)
            .map(i => path.relative(liveServerRoot, getAbsPathOfGivenAbsPath(i, projectPath)));
        const bundleFileUrls = bundleFilePaths.map(i => (
            getPredictJsUrl(liveServerHost, liveServerPort, i)
        ));
        console.log('🔥bundleFileUrls💥 ', bundleFileUrls);
    }

    const isUsed = await portIsUsed(liveServerPort, liveServerHost);
    if (isUsed) {
        logWarn(`Port ${liveServerPort} is occupied, pass...`)
        return;
    }

    const params = {
        // port: 15566, // Set the server port. Defaults to 8080.
        // host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
        // root: path.join(projectPath, 'public'), // Set root directory that's being served. Defaults to cwd.
        open: false, // When false, it won't load your browser by default.
        // ignore: 'scss,my/templates', // comma-separated string for paths to ignore
        // file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
        // wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
        // mount: [['/components', './node_modules']], // Mount a directory to a route.
        // logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
        // middleware: [function(req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
        ...liveServerOptions,
        host: liveServerHost,
        root: liveServerRoot,
    };
    liveServer.start(params);
}

execCmdOneByOne(
    [
        doPreCheck,
        doBuild,
        doBundle,
        doRestartServer,
    ]
).then(() => {
    console.log('🎉 ' + bgLightYellow('All tasks exec finished'));
});
