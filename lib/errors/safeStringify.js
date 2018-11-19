'use strict';

const ANNOTATIONS = require('./annotations');

// Inspired by json-stringify-safe
module.exports = (obj, spaces) =>

    JSON.stringify(obj, serializer(), spaces);

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
        const path = keys.slice(0, depth).map((k) => '.' + k).join('');
        return `[Circular ~${path}]`;
    };

    return function (key, value) {

        if (stack.length > 0) {
            const thisPos = stack.indexOf(this);
            if (~thisPos) {
                // this is in stack
                // truncate arrays
                // console.log(1, stack.length, keys.length);
                stack.length = thisPos + 1;
                keys.length = thisPos + 1;
                // console.log(2, stack.length, keys.length);
                stack.length = thisPos + 1;
                // if (keys[thisPos] !== key) {
                //     console.log('keys out', keys[thisPos], key);
                // }

                keys[thisPos] = key;
            }
            else {
                // this is not in stack
                stack.push(this);
                keys.push(key);
            }

            if (~stack.indexOf(value)) {
                // value is in stack
                value = cycleReplacer(value);
            }
        }
        else {
            stack.push(value);
        }

        if (value === Infinity || value === -Infinity || Number.isNaN(value) ||
            typeof value === 'function' || typeof value === 'symbol') {
            return '[' + value.toString() + ']';
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
