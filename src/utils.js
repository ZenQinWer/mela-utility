const os = require('os');
const fs = require('fs');
const { createReadStream, createWriteStream } = fs;
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const {
    blue,
    green,
    red,
    reset,
    yellow,
    white,
    gray,

    bgRed,

    bgBlue,
    bgMagenta,
    bgCyan,
} = require('kolorist');

const WIN = 'win';
const MAC = 'mac';
const LINUX = 'linux';
let osPlatform = WIN;
if (os.type() == 'Windows_NT') {
	// windows
    osPlatform = WIN;
}
if (os.type() == 'Darwin') {
	// mac
  osPlatform = MAC;
}
if (os.type() == 'Linux') {
	// linux
  osPlatform = LINUX;
}
const isWin = osPlatform === WIN;
const isMac = osPlatform === MAC;
const isLinux = osPlatform === LINUX;


function logInfo(msg) {
    console.log(green("Info: " + msg));
}
function logWarn(msg) {
    console.log(yellow("Warn: " + msg));
}
function logError(msg) {
    console.log(red("Error: " + msg));
}

function getAbsPathOfGivenAbsPath(initialPath, givenAbsPath) {
    return path.isAbsolute(initialPath) ? initialPath : path.join(givenAbsPath, initialPath);;
};

function portIsUsed(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer().listen(port, host);
        server.on('listening', () => {
            server.close();
            resolve(false);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            }
        });
    });
}

function getCommontSymbol(ext) {
    const commontSymbolMap = {
        ".js": "/// {0}",
        ".css": "/* {0} */",
    };
    const commontSymbol = commontSymbolMap[ext];
    return commontSymbol ? (function(text) {return commontSymbol.replace("{0}", text);}) : null
}
function streamMerge(fileList, fileWriteStream, option) {
    const {commontFn} = option;
    return new Promise((resolve, reject) => {
        function streamMergeRecursive(fileList, fileWriteStream) {
            if (!fileList.length) {
                console.log('-------- WriteStream merge finish --------');
                if (commontFn) {
                    fileWriteStream.write('\n');
                    fileWriteStream.write(commontFn(`---Stream merge file---`));
                }
                fileWriteStream.end('\n');
                resolve()
                return;
            }

            const chunkFilePath = fileList.shift();

            if (isFile(chunkFilePath)) {
                console.log('-------- Start merge file --------\n', chunkFilePath);
                const currentReadStream = createReadStream(chunkFilePath);
                if (commontFn) {
                    fileWriteStream.write(commontFn(`------ file: ${chunkFilePath} ------`));
                }
                fileWriteStream.write('\n');
                currentReadStream.pipe(fileWriteStream, { end: false });
                currentReadStream.on('end', () => {
                    fileWriteStream.write(`\n\n`);
                    console.log('-------- End merge file --------\n', chunkFilePath);
                    streamMergeRecursive(fileList, fileWriteStream);
                });
                currentReadStream.on('error', (error) => {
                    console.error('-------- WriteStream merge fail --------\n', error);
                    fileWriteStream.close();
                    reject(error)
                });
            }else {
                logWarn('-------- File does not exist --------');
                logWarn(chunkFilePath);
                streamMergeRecursive(fileList, fileWriteStream);
            }
        }
        streamMergeRecursive(fileList, fileWriteStream);
    })
}
async function streamMergeMain(sourceFiles, targetFile) {
    const fileWriteStream = createWriteStream(path.resolve(__dirname, targetFile));
    const timeTag = new Date().toLocaleString();
    const ext = path.extname(targetFile);
    const commontFn = getCommontSymbol(ext);
    if (commontFn) {
        fileWriteStream.write(commontFn(`------ Time version ${timeTag} ------`));
        fileWriteStream.write('\n\n');
    }
    if (/\.js$/.test(ext)) {
        fileWriteStream.write(`console.log("%c Debug with file(${path.basename(targetFile)}). ", "background-color:purple; color:white; border-radius: 2px;");\n\n`);
        fileWriteStream.write(`console.log("%c Time version is ${timeTag}. ", "background-color:purple; color:white; border-radius: 2px;");\n\n`);
    }
    await streamMerge(sourceFiles, fileWriteStream, {commontFn});
}

function spawnPromise(cmd, params, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            cmd,
            params,
            {
                stdio: 'inherit',
                ...options,
            }
        );
        // console.dir(child);
        child.on('exit', (code) => {
            console.log(`Child process exited with code ${code}`);
            resolve(code)
        });
        child.on('error', function (err) {
            console.log('error:', err);
            reject(err)
        });
        child.stdout?.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        child.stderr?.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });
    });
}

function isFile(inputPath) {
    try {
      const stat = fs.statSync(inputPath)
      return stat.isFile();
    } catch (error) {
      return false;
    }
}
function isDirectory(inputPath) {
    try {
      const stat = fs.statSync(inputPath)
      return stat.isDirectory();
    } catch (error) {
      return false;
    }
  }

function makeDirDashP(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }));
};

function readFile(filename) {
    return fs.readFileSync(filename, { encoding: 'utf-8', flag: 'r' });
}

function writeFile(filename, content) {
    fs.writeFileSync(filename, content, { encoding: 'utf-8' });
}

function isAsyncFunc(func) {
    return func.constructor.name === 'AsyncFunction';
}

function isReturnPromiseFunc(func) {
    const p = func();
    return isPromise(p);
}

function isPromise(p) {
    if (typeof p === 'object' && typeof p.then === 'function') {
        return true;
    }
    return false;
}

const colorList = [bgBlue, bgMagenta, bgCyan];
async function execCmdOneByOne(
    cmdFnList,
    options = {
        quit: false,
        optionsExecStart: () => {},
        optionsExecEnd: () => {},
        optionsExecError: () => {},
    }
) {
    function execStart(fnName, context, index) {
        if (!options.quit) {
            console.time(`Time Step-${Number(index) + 1} - ${fnName} last: `);
            console.group(colorList[index % colorList.length](`[Group: (Step ${Number(index) + 1}) - ${fnName}] `));
        }
        const optionsExecStart = options.execStart;
        typeof optionsExecStart === 'function' && optionsExecStart(fnName, context);
    }
    function execEnd(fnName, context, index) {
        if (!options.quit) {
            console.groupEnd();
            console.timeEnd(`Time Step-${Number(index) + 1} - ${fnName} last: `);
            console.log();
        }
        const optionsExecEnd = options.execEnd;
        typeof optionsExecEnd === 'function' && optionsExecEnd(fnName, context);
    }
    function execError(fnName, context, index) {
        if (!options.quit) {
            console.log(bgRed(`🔥Exec ${fnName} error💥 `))
            console.groupEnd();
            console.timeEnd(`Time Step-${Number(index) + 1} - ${fnName} last: `);
        }
        const optionsExecError = options.execError;
        typeof optionsExecError === 'function' && optionsExecError(fnName, context);
    }
    const results = {
        errors: null, errorIndexs: null,
        latestError: null, latestErrorIndex: null
    };
    for (const index in cmdFnList) {
        let result = {};
        const item = cmdFnList[index];
        let fn = item, args = [];
        if (Array.isArray(item)) {
            [fn, ...args] = item;
        }
        if (typeof fn === 'function') {
            const fnName = fn.name.replace(/^bound /, '')
            execStart(fnName, results, index)
            try {
                if (isAsyncFunc(fn)) {
                    result = await fn.apply(results, args);
                } else {
                    result = fn.apply(results, args);
                    if (isPromise(result)) {
                        result = await result;
                    }
                }
                Object.assign(results, {[index]: result, [fnName]: result});
                execEnd(fnName, results, index)
            } catch (error) {
                const wrappedError = {[index]: error, [fnName]: error};
                if (results.errors) {
                    Object.assign(results.errors, wrappedError);
                } else {
                    results.errors = wrappedError;
                }
                results.latestError = error;

                if (results.errorIndexs) {
                    results.errorIndexs.push(index);
                } else {
                    results.errorIndexs = [index];
                }
                results.latestErrorIndex = index;

                execError(fnName, results, index)
                if (!/__IgnoreError$/.test(fnName)) {
                    throw error;
                }
            }
        } else {
            Object.assign(results, {[index]: fn})
        }
    }
    return results;
}


module.exports = {
    isWin,
    isMac,
    isLinux,

    logInfo,
    logWarn,
    logError,

    isFile,
    isDirectory,
    makeDirDashP,
    readJsonFile,
    readFile,
    writeFile,
    getAbsPathOfGivenAbsPath,

    portIsUsed,
    streamMergeMain,
    spawnPromise,

    isAsyncFunc,
    isReturnPromiseFunc,
    isPromise,

    execCmdOneByOne,
};
