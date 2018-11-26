'use strict';

const ANNOTATIONS = require('./annotations');

// Inspired by json-stringify-safe
module.exports = (obj, spaces) =>

    JSON.stringify(obj, serializer(), spaces);

const serializer = function () {

    const keys = [];
    /**
     * used for tracking circulars?
     */
    const thises = [];

    return function (key, value) {

        const thisPos = thises.indexOf(this);
        if (thisPos === -1) {
            // if this is not in stack
            //    add to stack
            thises.push(this);
            keys.push(key);
        }
        else {
            // this is in stack
            // truncate arrays
            thises.length = thisPos + 1;
            keys.length = thisPos + 1;
            keys[thisPos + 1] = key;
        }


        const valuePos = thises.indexOf(value);
        if (~valuePos) {
            // value is in stack
            // we cannot return value as it would throw
            const path = keys
                .slice(1, valuePos)
                .map((k) => '.' + k)
                .join('');
            return `[Circular ~${path}]`;
        }

        if (value === Infinity || value === -Infinity || Number.isNaN(value) ||
            typeof value === 'function' || typeof value === 'symbol') {
            return '[' + value.toString() + ']'; // without [] this will be quoted in output
        }

        if (!value) {
            return value;
        }

        const annotations = value[ANNOTATIONS];

        if (!annotations) {
            return value;
        }

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

        return value;
    };
};
