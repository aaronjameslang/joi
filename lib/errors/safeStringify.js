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

    return function (key, value) {

        const thisPos = stack.indexOf(this);
        if (thisPos === -1) {
            // if this is not in stack
            //    add to stack
            stack.push(this);
            keys.push(key);
        }
        else {
            // this is in stack
            // truncate arrays
            stack.length = thisPos + 1;
            keys.length = thisPos + 1;

            keys[thisPos + 1] = key;
        }

        const valuePos = stack.indexOf(value);
        if (~valuePos) {
            // value is in stack
            // we cannot return value as it would throw
            const path = keys.slice(1, valuePos).map((k) => '.' + k).join('');
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
