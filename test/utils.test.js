const {cloneDeep} = require('lodash');
const {execCmdOneByOne} = require('../src/utils.js');

const constructorParams = {
    errors: null, errorIndexs: null,
    latestError: null, latestErrorIndex: null
};

function fn1 () {
    return {a: 1};
}

function fn2 () {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(2);
        }, 3000);
    });
}

async function fn3 () {
    return {c: 3};
}

function fnUseContext1 () {
    return {
        foo: this.fn1?.a,
        bar: this.fn2,
    };
}

async function fnWithParams (name, age) {
    return {
        name,
        age,
        bar: this.fn2,
    };
}

const errorIgnore = new Error('Error, ignore, continue exec.');
async function fnError__IgnoreError () {
    throw errorIgnore;
}

const errorThrow = new Error('Error, break exec.');
async function fnError () {
    throw errorThrow;
}

it('condition - 1, exec success', async () => {
    const res = await execCmdOneByOne([fn1, fn2, fn3, 4], {quit: true});
    const expectResults = {
        '0': {a: 1},
        'fn1': {a: 1},
        '1': 2,
        'fn2': 2,
        '2': {c: 3},
        'fn3': {c: 3},
        '3': 4,
    };
    const cloneDeepConstructorParams = cloneDeep(constructorParams);
    expect(res).toEqual({
        ...cloneDeepConstructorParams,
        ...expectResults,
    });

    const {fn2: fn2Result} = res;
    expect(fn2Result).toEqual(2);
});

it('condition - 2, exec use share-context success', async () => {
    const res = await execCmdOneByOne([fn1, fn2, fnUseContext1], {quit: true});
    const expectResults = {
        '0': {a: 1},
        'fn1': {a: 1},
        '1': 2,
        'fn2': 2,
        '2': {foo: 1, bar: 2},
        'fnUseContext1': {foo: 1, bar: 2},
    };
    const cloneDeepConstructorParams = cloneDeep(constructorParams);
    expect(res).toEqual({
        ...cloneDeepConstructorParams,
        ...expectResults,
    });
});

it('condition - 3, exec use with-params success', async () => {
    // const res = await execCmdOneByOne([fn1, fn2, fnWithParams.bind(this, 'wen', 100)], {quit: true});
    const res = await execCmdOneByOne([
        fn1,
        fn2,
        [fnWithParams, 'wen', 100]
    ], {quit: true});
    const expectResults = {
        '0': {a: 1},
        'fn1': {a: 1},
        '1': 2,
        'fn2': 2,
        '2': { name: 'wen', age: 100, bar: 2 },
        'fnWithParams': { name: 'wen', age: 100, bar: 2 },
    };
    const cloneDeepConstructorParams = cloneDeep(constructorParams);
    expect(res).toEqual({
        ...cloneDeepConstructorParams,
        ...expectResults,
    });
});

it('condition - 4, exec error but continue', async () => {
    const res = await execCmdOneByOne([
        fn1,
        fn2,
        fnError__IgnoreError,
    ], {quit: true});
    const error = res.latestError;
    expect(error).toEqual(errorIgnore);
});

it('condition - 5, exec error fail', async () => {
    // used for main.js
    // execCmdOneByOne([
    //     fn1,
    //     fn2,
    //     fnError__IgnoreError,
    //     fnError
    // ], {quit: true}).catch(error => {
    //     // console.log('🔥error💥 ', error);
    //     expect(error).toEqual(errorThrow);
    // })

    try {
        await execCmdOneByOne([
            fn1,
            fn2,
            fnError__IgnoreError,
            fnError,
            fn3,
        ], {quit: true})
    } catch (error) {
        expect(error).toEqual(errorThrow);
    }
});

it('condition - 6, exec text context', async () => {
    await execCmdOneByOne([
        fn1,
        fn2,
    ], {
        quit: true,
        optionsExecStart: (fnName, context) => {
            if (fnName === 'fn1') {
                expect(context.fn1).toEqual(undefined);
                expect(context.fn2).toEqual(undefined);
            }
            if (fnName === 'fn2') {
                expect(context.fn1).toEqual({a: 1});
                expect(context.fn2).toEqual(undefined);
            }
        },
        optionsExecEnd: (fnName, context) => {
            if (fnName === 'fn1') {
                expect(context.fn1).toEqual({a: 1});
                expect(context.fn2).toEqual(undefined);
            }
            if (fnName === 'fn2') {
                expect(context.fn1).toEqual({a: 1});
                expect(context.fn2).toEqual(2);
            }
        },
    })
});
