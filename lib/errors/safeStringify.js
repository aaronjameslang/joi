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
     * 0 value is a value
     * might contain values
     * used for tracking circulars?
     */
    const stack = [];

    const cycleReplacer = (value) => {

        const depth = stack.indexOf(value);
        const path = keys.slice(1, depth + 1).map((k) => '.' + k).join('');
        return `[Circular ~${path}]`;
    };

    return function (key, value) {

        if (stack.length === 0) {
            console.log('stack is 0');
            console.log({ this: this, key, value, keys, stack });
            stack.push(value); // push root object onto stack
            stack.push(this); // push root object onto stack
            keys.push(key);
        }
        else {
            const thisPos = stack.indexOf(this);
            if (~thisPos) {
                // this is in stack
                // truncate arrays
                // console.log(1, stack.length, keys.length);
                stack.length = thisPos + 1;
                keys.length = thisPos + 1;
                // console.log(2, stack.length, keys.length);
                // if (keys[thisPos] !== key) {
                //     console.log('keys out', keys[thisPos], key);
                // }

                keys[thisPos + 1] = key;
            }
            else {
                // this is not in stack
                stack.push(this);
                keys.push(key);
            }

            if (~stack.indexOf(value)) {
                // value is in stack
                return cycleReplacer(value);
            }
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
            value[errorKey] = undefined;
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
