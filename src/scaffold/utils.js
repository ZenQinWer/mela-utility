const {cloneDeep} = require('lodash');
const { parse, stringify } = require('scss-parser')
const {logWarn, logError} = require('../utils');

// [parse_atom ](https://github.com/salesforce-ux/scss-parser/blob/9ac7b7357ef5d708009c4ffb954023c8fe68fb3a/lib/parse.js#L358-L397)
// const selectorTypes = [
//     'operator', 'identifier', 'punctuation',
//     'class',
//     'id', 'color_hex', // 在 'selector' 对象下的 'color_hex' 那不就是 'id' 吗
//     'attribute',
//     'pseudo_element'
// ];
const simpleStrTypes = ['operator', 'identifier', 'punctuation', 'space'];
const selectorTypeMapSymbol = {
    class: '.',
    id: '#',
    pseudo_class: ':',

    // `:nth-child(2)`   `: is pseudo_class` `nth-child is function` `2 is arguments`
    function: '',
    arguments: '',
};
const selectorTypes = Object.keys(selectorTypeMapSymbol);
function getSelectorName(selectorObj) {
    let res = '';
    const deepIter = (tree) => {
        const treeValue = tree.value;
        if (Array.isArray(treeValue)) {
            if (selectorTypes.includes(tree.type)) {
                treeValue.unshift({
                    type: 'selector-origin-symbol',
                    value: selectorTypeMapSymbol[tree.type],
                });
                if (tree.type === 'arguments') {
                    treeValue.unshift({
                        type: 'arguments-left-parentheses',
                        value: '(',
                    });
                    treeValue.push({
                        type: 'arguments-right-parentheses',
                        value: ')',
                    });
                }
            } else {
                logWarn(`${tree.type} is selectorType, but not included by selectorTypes, plz improve the script.`);
                console.dir(tree, {depth: null});
            }
            treeValue.forEach(item => {
                deepIter(item)
            });
        } else if (typeof treeValue === 'string') {
            res += treeValue;
        } else {
            logWarn(`{i.value} is not array or string.`);
        }
    }
    deepIter(selectorObj);
    return res;
}
function generateComparebleSelector(selector) {
    const selectorObjs = cloneDeep(selector.value).find(i => i.type === 'selector')
        .value
        // .value.filter(i => selectorTypes.includes(i.type))
        .map(i => {
            // 1.
            // 用来解析没涉及到的选择器 debug
            // console.log('🔥i.value💥 ', i);
            /// TAG
            // return typeof i.value === 'string' ? i.value : (i.value || []).filter(j => j.type === 'identifier').map(k => k.value).join('~');

            // 2.
            // if (simpleStrTypes.includes(i.type)) {
            //     return i.value;
            // } else if (selectorTypes.includes(i.type)) {
            //     // if (i.value.length > 1) {
            //     //     logWarn(`${i.type} got more than 1 length, plz improve the script.`);
            //     //    console.dir(i, {depth: null});
            //     // }
            //     const selector__notSimpleStrType = (i.value || []).find(i => !simpleStrTypes.includes(i.type));
            //     if (selector__notSimpleStrType) {
            //         logWarn(`Under selectorType, there exsit notSimpleStrType, plz improve the script.`);
            //         console.dir(i, {depth: null});
            //     }

            //     const selector__simpleStrTypes = (i.value || []).filter(i => simpleStrTypes.includes(i.type));
            //     return selectorTypeMapSymbol[i.type] + selector__simpleStrTypes.map(k => k.value).join('');
            // } else if (i.type === 'color_hex') {
            //     // TAG （特殊处理） 在 'selector' 对象下的 'color_hex' 那不就是 'id' 吗
            //     // BUG (原始库的bug)
            //     return `#${i.value}`;
            // } else {
            //     logWarn(`${i.type} do not in my typs (simpleStrTypes) or (selectorTypes), plz improve the script.`);
            //     console.dir(i, {depth: null});
            //     return typeof i.value === 'string' ? i.value : (i.value || []).map(k => k.value).join('');
            // }

            // 3.
            return getSelectorName(i);
        });
    // const aStr = selectorObjs.join('~~~').replace(/\W/g, '');
    // const aStr = selectorObjs.join('~~~').replace(/[^A-Za-z0-9_]/g, '');
    const originStr = selectorObjs.join('');
    const compareStr = originStr.replace(/[^A-Za-z0-9\*]/g, '');
    return {originStr, compareStr};
}
function ruleWithComment(cloneItemVal, index) {
    try {
        // console.log('🔥index💥 ', index);
        let indexCursor = index - 1;
        const commontTypes = ['comment_singleline', 'comment_multiline'];
        const validTypes = ['space', ...commontTypes];
        let validLines = [];
        while(indexCursor > -1 && validTypes.includes(cloneItemVal[indexCursor].type)) {
            validLines.push(indexCursor);
            indexCursor -= 1;
        }
        validLines.reverse();
        const firstCommentLine = validLines.findIndex(i => commontTypes.includes(cloneItemVal[i].type));
        if (firstCommentLine > -1) {
            // console.log('🔥firstCommentLine💥 ', firstCommentLine);
            validLines = validLines.slice(firstCommentLine);
            // console.log('🔥validLines💥 ', validLines);
            const startFrom = validLines[0];
            return {
                firstIndexTag: cloneItemVal[startFrom].indexTag,
                startFrom,
                offsetCnt: validLines.length,
            };
        }
        // if (
        //     cloneItemVal[index - 1].type === 'space'
        //         && ['comment_singleline', 'comment_multiline'].includes(cloneItemVal[index - 2].type)
        // ) {

        //     return true;
        // }
        return null;
    } catch (error) {
        return null;
    }
}
const extraSpace = (list, line) => {
    try {
        const val = list[line - 1].value;
        const index = val.indexOf(' ');
        if (index > -1) {
            list[line - 1].value = val.slice(0, index);
            return val.slice(index);
        }
    } catch (error) {
        
    }
}
// function migrateSpace(list, fromLine, toLine) {
//     try {
//         const from = list[fromLine];
//         const to = list[toLine];
//         const fromM1 = list[fromLine - 1];
//         const toM1 = list[toLine - 1];
//         if (fromM1.type === 'space' && toM1.type === 'space') {
//             const fromSpace = /[^\n]*$/gm.exec(fromM1.value)[0];
//             toM1.value = toM1.value.replace(/[^\n]*$/gm, fromSpace);
//             if (from.value === '*333') {
//                 console.log('🔥fromM1.value💥 ', fromM1.value + 111);
//                 console.log('🔥fromM1.value💥 ', fromSpace);
//                 console.log('🔥fromM1.value💥 ', fromSpace.length);
//                 console.log('🔥toM1.value💥 ', toM1.value + 111);
//             }
//             console.log(9999999)
//             if (from.value === 'zzz') {
//                 console.log('🔥fromM1.value 99💥 ', fromM1.value + 111);
//                 console.log('🔥fromM1.value 99💥 ', fromSpace);
//                 console.log('🔥fromM1.value 99💥 ', fromSpace.length);
//                 console.log('🔥toM1.value 99💥 ', toM1.value + 111);
//             }
//         }
//     } catch (error) {
        
//     }
// }
function migrateSpace(fromM1, toMn) {
    try {
        // const from = list[fromLine];
        // const to = list[toLine];
        // const fromM1 = list[fromLine - 1];
        // const toM1 = list[toLine - 1];
        console.log('🔥fromM1💥 ', fromM1);
        console.log('🔥toMn💥 ', toMn);
        if (fromM1.type === 'space' && toMn.type === 'space') {
            const fromSpace = /[^\n]*$/.exec(fromM1.value)[0];
            console.log('🔥fromSpace.length💥 ', fromSpace.length);
            toMn.value = toMn.value.replace(/[^\n]*$/, fromSpace);
            // if (from.value === '*333') {
            //     console.log('🔥fromM1.value💥 ', fromM1.value + 111);
            //     console.log('🔥fromM1.value💥 ', fromSpace);
            //     console.log('🔥fromM1.value💥 ', fromSpace.length);
            //     console.log('🔥toM1.value💥 ', toM1.value + 111);
            // }
            // console.log(9999999)
            // if (from.value === 'zzz') {
            //     console.log('🔥fromM1.value 99💥 ', fromM1.value + 111);
            //     console.log('🔥fromM1.value 99💥 ', fromSpace);
            //     console.log('🔥fromM1.value 99💥 ', fromSpace.length);
            //     console.log('🔥toM1.value 99💥 ', toM1.value + 111);
            // }
        }
    } catch (error) {
        
    }
}
function scssAlphabetical(scssCode) {
    // Create an AST from a string of SCSS
    let ast = parse(scssCode)
    // console.dir(ast, {depth: null});

    const widthIter = (tree) => {
        let itemArr = [tree];
        while(itemArr.length > 0) {
            const itemOut = itemArr.shift();

            if (itemOut && (itemOut.type === 'stylesheet' || itemOut.type === 'rule' || itemOut.type === 'block')) {
                // TAG 当 itemOut.type === 'stylesheet' 的时候，itemOut.value 里的 item 好像是只读的（除了type 是selector 的可写），不知道啥原因
                // console.log('🔥itemOut.type === 💥 ', itemOut.type === 'stylesheet');
                // itemOut.value.forEach((i, index) => {
                //     console.log('🔥index💥 ', index);
                //     i.indexTag = index;
                //     console.log('🔥i.indexTag💥 ', i.indexTag);
                // });
                itemOut.value = itemOut.value.map((i, index) => {
                    return {...i, indexTag: index}
                });
                if (itemOut.type === 'stylesheet' || itemOut.type === 'block') {
                    // handle itemOut
                    const cloneItemVal = cloneDeep(itemOut.value)
                    const positioins = [];
                    const withCommontList = [];
                    const onlyRules = cloneItemVal.filter((i, ind) => {
                        const isRule = i.type === 'rule';
                        if (isRule) {
                            positioins.push(ind);
                            const commontLineInfo = ruleWithComment(cloneItemVal, ind);
                            if (commontLineInfo) {
                                withCommontList.push({
                                    ...i,
                                    ...commontLineInfo,
                                })
                            }
                        }
                        return isRule;
                    });

                    if (onlyRules.length) {
                        console.log(`[Block] with ${onlyRules.length} selectors:`);
                        onlyRules.forEach(i => {
                            const {originStr, compareStr} = generateComparebleSelector(i);
                            console.log('\tSelector: ', originStr, '\t', compareStr);
                            if (!originStr) {
                                // BUG
                                // 此处会有一个不过， 是库的bug，该库在分词的时候，会把 `#fbceee {}` 中的 #fbceee 识别成 `颜色`，但此处应该是 `id选择器`
                                    // (#fbc #fbceee)会识别成颜色。 (#gbc #gbceee #fbcd #fbceeee)不会识别成颜色。
                                logWarn('Regnize selector name error, got empty');
                            }
    
                        });
                    }
                    onlyRules.sort((a, b) => {
                        // const aSelectorObjs = cloneDeep(a.value).find(i => i.type === 'selector')
                        //     .value.filter(i => selectorTypes.includes(i.type))
                        //     .map(i => {
                        //         // 用来解析没涉及到的选择器 debug
                        //         // console.log('🔥i.value💥 ', i.value);
                        //         /// TAG
                        //         return typeof i.value === 'string' ? i.value : (i.value || []).filter(j => j.type === 'identifier').map(k => k.value).join('-');
                        //     });
                        // const bSelectorObjs = cloneDeep(b.value).find(i => i.type === 'selector')
                        //     .value.filter(i => selectorTypes.includes(i.type))
                        //     .map(i => {
                        //         /// TAG
                        //         return typeof i.value === 'string' ? i.value : (i.value || []).filter(j => j.type === 'identifier').map(k => k.value).join('-');
                        //     });
                        // const aStr = aSelectorObjs.join('~~~');
                        // const bStr = bSelectorObjs.join('~~~');
                        const {compareStr: aStr} = generateComparebleSelector(a);
                        const {compareStr: bStr} = generateComparebleSelector(b);
                        // console.log(`🔥${aStr}\t <-> \t${bStr}💥 `);
                        return aStr.localeCompare(bStr);
                    });
                    // console.dir(onlyRules, {depth: null});
                    // console.log('🔥positioins💥 ', positioins);
                    positioins.forEach((ind, index) => {
                        // // 「5」
                        // let from3;
                        // try {
                        //     const fromIndex = itemOut.value.findIndex(j => j.indexTag === onlyRules[index].indexTag);
                        //     from3 = itemOut.value[fromIndex - 1];
                        //     console.log('🔥from333💥 ', itemOut.value[fromIndex]);
                        // } catch (error) {
                        //     from3 = null;
                        // }

                        // 「6」
                        itemOut.value[ind] = onlyRules[index];

                        // // 「5」
                        // let to4;
                        // try {
                        //     // to4 = itemOut.value[ind - 1];
                        //     const toIndex = itemOut.value.findIndex(j => j.indexTag === onlyRules[index].indexTag);
                        //     to4 = itemOut.value[toIndex - 1];
                        // } catch (error) {
                        //     to4 = null;
                        // }
                        // console.log('🔥from3💥 ', from3);
                        // console.log('🔥to4💥 ', to4);
                        // console.log('🔥to444💥 ', itemOut.value[ind]);
                        // // 「5」
                        // migrateSpace(from3, to4);
                    });
                    // console.log('🔥itemOut.value💥 ', itemOut.value);
                    // console.log('🔥withCommontList💥 ', withCommontList);
                    // console.log('🔥itemOut.value💥 ', itemOut.value);
                    withCommontList.forEach(i => {
                        const {firstIndexTag, startFrom, offsetCnt} = i;
                        // console.log('🔥i.indexTag💥 ', i.indexTag);
                        const commentLine = itemOut.value.findIndex(j => j.indexTag * 1 === i.firstIndexTag * 1);
                        // console.log('🔥commentLine💥 ', commentLine);
                        const res = itemOut.value.splice(commentLine, offsetCnt);
                        // console.log('🔥res💥 ', res);
                        // FIXME 此处还有一些空格的小bug， 移动到新位置，可能会已经有了 `\n\n    ` 这四个空格就会影响到你新移动过来的锁进
                        // const spaces = extraSpace(itemOut.value, commentLine);
                        // if (spaces) {
                        //     res[0].value = `${spaces}${res[0].value}`;
                        // }
                        // 「1」
                        let selectorLine = itemOut.value.findIndex(j => j.indexTag * 1 === i.indexTag * 1);

                        // TAG 备注，针对以上 BUG，所以要求原始的scss 文件里必须按规范来书写（既： 在相同的代码块里，`注释`和`选择器`保持相同的缩进长度）
                        // // 「2」
                        // let fromM1;
                        // try {
                        //     fromM1 = itemOut.value[commentLine - 1];
                        // } catch (error) {
                        //     fromM1 = null;
                        // }

                        // 「1」
                        itemOut.value.splice(selectorLine, 0, ...res);

                        // // 「2」
                        // selectorLine = itemOut.value.findIndex(j => j.indexTag * 1 === i.firstIndexTag * 1);
                        // // 「2」
                        // let toMn;
                        // // console.log('🔥offsetCnt💥 ', offsetCnt);
                        // try {
                        //     toMn = itemOut.value[selectorLine -1];
                        //     // console.log('🔥toMn xxx💥 ', toMn);
                        //     // toMn.value = toMn.value + '          '
                        //     // console.log('🔥toMn yyy💥 ', itemOut.value[selectorLine]);
                        // } catch (error) {
                        //     toMn = null
                        // }
                        // migrateSpace(fromM1, toMn);
                    });
                    // console.dir(onlyRules);
                }
                (itemOut.value|| []).forEach(item => {
                    itemArr.push(item)
                })
            }
        }
    }
    widthIter(ast)


    return stringify(ast);

}


function scssImportsAlphabetical(scssCode, importModule) {
    // Create an AST from a string of SCSS
    let ast = parse(scssCode)
    // console.dir(ast, {depth: null});

    const newLine = {
      type: 'space',
      value: '\r\n',
      start: { cursor: 228, line: 14, column: 25 },
      next: { cursor: 230, line: 15, column: 0 }
    };

    const newImport = {
      type: 'atrule',
      value: [
        {
          type: 'atkeyword',
          value: 'import',
        },
        {
          type: 'space',
          value: ' ',
        },
        {
          type: 'string_single',
          value: importModule,
        },
        {
          type: 'punctuation',
          value: ';',
        }
      ],
    };
    let lastImportIndex = -1;
    // const insertIndex = ast.value.findLastIndex(i => {
    const insertIndex = ast.value.findIndex((i, index) => {
        if (i.type !== 'atrule') return false;
        lastImportIndex = index;
        const stringSingleObj = i.value.find(i => i.type === 'string_single');
        if (!stringSingleObj) return false;
        return stringSingleObj.value.localeCompare(importModule) > -1
    });
    if (insertIndex > -1) {
        ast.value.splice(insertIndex, 0, newImport, newLine);
    } else if (lastImportIndex > -1) {
        ast.value.splice(lastImportIndex + 1, 0, newLine, newImport);
    } else {
        ast.value.push(newLine);
        ast.value.push(newImport);
        ast.value.push(newLine);
    }

    return stringify(ast);

}

function parseImportSyntext(code) {
    const res = /^import\s+(?<importModule>\w+)\s+from\s+['"](?<source>[^'"]+)['"];/.exec(code.trim());
    return res?.groups || res;
}
function handleInsertImport(vueCodeList, insertCode) {
    const insertElement = parseImportSyntext(insertCode);
    const {importModule: insertImportModule, source: insertSource} = insertElement;
    const startFrom = 2;
    const endTo = insertSource.indexOf('/', startFrom);
    const insertSourcePrefix = insertSource.slice(0, endTo);
    // 预检查，`检查`相同模块之前是否被引用过
    vueCodeList.forEach((i) => {
        const comparedElement = parseImportSyntext(i);
        if (!comparedElement) {
            return;
        }
        const {importModule: comparedImportModule} = comparedElement;
        const compareResult = comparedImportModule.localeCompare(insertImportModule);
        if (compareResult === 0) {
            logError(`${insertImportModule} has already exist, plz check!`);
            process.exit(1);
        }
    });

    // 查找index
    let lastMatchIndex = -1;
    let insertIndex = vueCodeList.findIndex((i, index) => {
        const comparedElement = parseImportSyntext(i);
        if (!comparedElement) {
            return false;
        }
        const {importModule: comparedImportModule, source: comparedSource} = comparedElement;
        if (!comparedSource.startsWith(insertSourcePrefix)) {
            return false;
        }
        lastMatchIndex = index;
        return comparedImportModule.localeCompare(insertImportModule) > -1;
    });
    if (insertIndex === -1) {
        // 如果以上没匹配到，则插在最后一个符合该scope 之后
        // 如果都没匹配到，则放在第一行 `-1 + 1 = 0`
        insertIndex = lastMatchIndex + 1;
    }

    // do insert
    if (lastMatchIndex === -1) {
        // 插在第一行之前
        vueCodeList.splice(0, 0, '// TODO (Auto match failed)Place This to right line.', insertCode);
    } else {
        vueCodeList.splice(insertIndex, 0, insertCode);
    }
}
function parseExportSyntext(code) {
    // console.log('🔥code💥 ', code);
    const res = /^\s*(?<exportModule>\w+),?/.exec(code.trim());
    // console.log('🔥res💥 ', res);
    return res?.groups || res;
}
function handleInsertExport(vueCodeList, insertCodeExport, type) {
    let exportStartLine, exportEndLine;
    if (type === 'ArrayType') {
        exportStartLine = vueCodeList.findIndex(i => /const\s+data\s+=\s+\[/.test(i));
        exportEndLine = vueCodeList.findIndex(i => /];?/.test(i));
    } else {
        exportStartLine = vueCodeList.findIndex(i => /export\s+default\s+\{/.test(i));
        exportEndLine = vueCodeList.findIndex(i => /};?/.test(i));
    }

    let firstExportLine = '';
    const insertElement = insertCodeExport;
    let insertIndex = -1;
    let lastMatchIndex = -1;
    for (const i in vueCodeList) {
        if (i > exportStartLine && i < exportEndLine) {
            const exportValue = vueCodeList[i];
            const compareElement = parseExportSyntext(exportValue);
            if (!compareElement) {
                continue;
            }
            if (!firstExportLine) {
                firstExportLine = vueCodeList[i];
            }
            const {exportModule} = compareElement;
            const compareResult = exportModule.localeCompare(insertElement);
            if (compareResult === 0) {
                logError(`{InsertImportModule} has already exist, plz check!!!`);
                process.exit(1);
            } else if (compareResult > 0 && insertIndex === -1) {
                insertIndex = i;
            } else {
                lastMatchIndex = i;
            }
        }
    }

    let insertToLastLine = false;
    if (insertIndex === -1) {
        // 如果以上没匹配到，则插在最后一个符合该scope 之后
        // 如果都没匹配到，则放在第一行 `-1 + 1 = 0`
        insertIndex = lastMatchIndex * 1 + 1;
        insertToLastLine = true;
    }
    // do insert
    if (lastMatchIndex === -1) {
        vueCodeList.splice(exportStartLine * 1 + 1, 0, `    ${insertCodeExport}`);
    } else if (insertToLastLine) {
        const lastMatchVal = vueCodeList[lastMatchIndex];
        vueCodeList[lastMatchIndex] = lastMatchVal.endsWith(',') ? lastMatchVal : `${lastMatchVal},`;
        vueCodeList.splice(insertIndex, 0, lastMatchVal.replace(/\w+/g, insertCodeExport));
    } else {
        vueCodeList.splice(insertIndex, 0, firstExportLine.replace(/\w+/g, insertCodeExport));
    }
}
function vueImportsAlphabetical(vueCode, insertCode, insertCodeExport) {
    const vueCodeList = vueCode.split('\n');

    // Handle import
    handleInsertImport(vueCodeList, insertCode);
    // Handle export
    handleInsertExport(vueCodeList, insertCodeExport);

    return vueCodeList.join('\n');
}

// usage
// // 1. 把scss 的selector 按照字母排序
// const fs = require('fs');
// const {sourceScssFile2, targetScssFile2} = require('./constants');

// const {scssAlphabetical} = require('./utils');

// const scssContent = fs.readFileSync(sourceScssFile2, 'utf8');
// const scss = scssAlphabetical(scssContent)
// fs.writeFileSync(targetScssFile2, scss);


// usage
// // 2. 按照字母排序来引入依赖
// const fs = require('fs');
// const {sourceScssFile, targetScssFile} = require('./constants');
// const {scssImportsAlphabetical} = require('./utils');

// const scssContent = fs.readFileSync(sourceScssFile, 'utf8');
// const importModule = './aacdBbb-ccc';
// const scss = scssImportsAlphabetical(scssContent, importModule)
// fs.writeFileSync(targetScssFile, scss);

function mockDataHandleInsertImport(codeList, insertCode) {
    let insertIndex = -1;
    codeList.forEach((i, index) => {
        const comparedElement = parseImportSyntext(i);
        if (!comparedElement) {
            return;
        }
        insertIndex = index;
    });

    // do insert
    if (insertIndex === -1) {
        // 插在第一行之前
        codeList.splice(0, 0, '// TODO (Auto match failed)Place This to right line.', insertCode);
    } else {
        codeList.splice(insertIndex + 1, 0, '', '// TODO {feature name}', insertCode);
    }
}
function mockDataImportsAlphabetical(code, insertCodeImport, insertCodeExport) {
    const codeList = code.split('\n');

    // Handle import
    mockDataHandleInsertImport(codeList, insertCodeImport);
    // // Handle export
    handleInsertExport(codeList, insertCodeExport, 'ArrayType');

    return codeList.join('\n');
}




function storeHandleInsertImport(codeList, insertCode) {
    const insertElement = parseImportSyntext(insertCode);
    const {importModule: insertImportModule} = insertElement;
    let insertIndex = codeList.findIndex((i, index) => {
        const comparedElement = parseImportSyntext(i);
        if (!comparedElement) {
            return false;
        }
        const {importModule: comparedImportModule} = comparedElement;
        return comparedImportModule.localeCompare(insertImportModule) > -1;
    });

    // do insert
    if (insertIndex === -1) {
        // 插在第一行之前
        codeList.splice(0, 0, '// TODO (Auto match failed)Place This to right line.', insertCode);
    } else {
        codeList.splice(insertIndex, 0, insertCode);
    }
}
function storeImportsAlphabetical(code, insertCodeImport, insertCodeExport) {
    const codeList = code.split('\n');

    // Handle import
    storeHandleInsertImport(codeList, insertCodeImport);
    // // Handle export
    handleInsertExport(codeList, insertCodeExport);

    return codeList.join('\n');
}
module.exports = {
    scssAlphabetical,
    scssImportsAlphabetical,
    vueImportsAlphabetical,
    mockDataImportsAlphabetical,
    storeImportsAlphabetical,
};
