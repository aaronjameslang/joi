'use strict';

const ANNOTATIONS = require('./annotations');

// Inspired by json-stringify-safe
module.exports = (obj, spaces) => {
    try {
        return JSON.stringify(obj, serializer(), spaces);
    }
    catch (e) {
        console.log('Tried to stringify: ', obj);
        throw e;
    }
};


const serializer = function () {

    const keys = [];
    /**
     * used for tracking circulars?
     */
    const thises = [];

    return function (key, value) {

        const d = false;
        if (d && thises.length > 5) {
            throw Error();
        }
        d && console.log('vv', JSON.stringify(keys));
        const thisPos = thises.indexOf(this);
        if (thisPos === -1) {
            // if this is not in stack
            //    add to stack
            thises.push(this);
            keys.push(key);
            d && console.log('push', key)
        // } else if (thisPos !== thises.length-1) {
        //     throw new Error()
        }
        else {
            // this is in stack
            // truncate arrays
            // console.log('truncating');

            // console.log(thises.length, thises);
            thises.length = thisPos + 1;
            // console.log(thises.length, thises);

            // console.log(keys.length, keys);
            d && console.log('trunc-set', thisPos + 1, keys.length, key);
            keys.length = thisPos + 1;
            // console.log(keys.length, keys);

            keys[thisPos + 1] = key;
            // console.log(keys.length, keys);
        }

        // console.log({keys, stack})
        d && console.log('->', JSON.stringify(keys));

        const valuePos = thises.indexOf(value);
        if (~valuePos) {
            // value is in stack
            // we cannot return value as it would throw
            // console.log(keys.length - valuePos)
            const path = keys.slice(1, valuePos).map((k) => '.' + k).join('');
            d && console.log('-->', path);
            return `[Circular ~${path}]`;
        }

        if (value === Infinity || value === -Infinity || Number.isNaN(value) ||
            typeof value === 'function' || typeof value === 'symbol') {
            return '[' + value.toString() + ']'; // without [] this will be quoted in output
        }

        if (!value) {
            return value;
        }


        // if (value) {
        const annotations = value[ANNOTATIONS];

        if (!annotations) {
            return value;
        }

        // if (annotations) {
        if (Array.isArray(value)) {
            const annotated = [];

            for (let i = 0; i < value.length; ++i) {
                if (annotations.errors[i]) {
                    annotated.push(`_$idx$_${annotations.errors[i].sort().join(', ')}_$end$_`);
                }

                annotated.push(value[i]);
            }

            return annotated;

        }

        // else {
        const errorKeys = Object.keys(annotations.errors);
        for (let i = 0; i < errorKeys.length; ++i) {
            const errorKey = errorKeys[i];
            value[`${errorKey}_$key$_${annotations.errors[errorKey].sort().join(', ')}_$end$_`] = value[errorKey];
            delete value[errorKey];
        }

        const missingKeys = Object.keys(annotations.missing);
        for (let i = 0; i < missingKeys.length; ++i) {
            const missingKey = missingKeys[i];
            value[`_$miss$_${missingKey}|${annotations.missing[missingKey]}_$end$_`] = '__missing__';
        }
        // }

        return value;
        // }
        // }

        // return value;
    };
};
