'use strict';

const ANNOTATIONS = require('./annotations');

// Inspired by json-stringify-safe
module.exports = (obj, spaces) =>

    JSON.stringify(obj, serializer(), spaces);

/**
 * This serializer serves three functions
 * 1) It protects against circular references by tracking previous values
 *   and returning "[Circular ~x.y.z]" in place of repeated values
 * 2) It encodes special values (such as NaN) in "[]",
 *   which can then later be detected and reformatted
 * 3) It encodes annotations, which describe errors and omissions in the object,
 *   these can later be detected reformatted for human readability
 * @return {Function}
 */
const serializer = function () {

    /**
     * Arrays used to track previous values,
     *   to detect circular references
     */
    const keys = [];
    const thises = [];

    return function (key, value) {

        /**
         * Keep keys/thises up to date
         */
        const thisPos = thises.indexOf(this);
        if (thisPos === -1) {
            thises.push(this);
            keys.push(key);
        }
        else {
            thises.length = thisPos + 1;
            keys.length = thisPos + 1;
            keys[thisPos + 1] = key;
        }

        /**
         * Check if this is a circular reference
         * If so, returning it would cause a type error
         * Return a message string instead
         */
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

        /**
         * Encode special values to strings
         * These values have no JSON equivalent, but we encode them as "[x]"
         */
        if (value === Infinity || value === -Infinity || Number.isNaN(value) ||
            typeof value === 'function' || typeof value === 'symbol') {
            return '[' + value.toString() + ']';
        }

        /**
         * If value is 'normal', i.e. unannotated, return it
         */
        if (!value) {
            return value;
        }

        const annotations = value[ANNOTATIONS];

        if (!annotations) {
            return value;
        }

        /**
         * Value is annotated
         * Encode annotations in keys and properties as appropriate
         */
        if (Array.isArray(value)) {
            /**
             * Value is an array, insert annotations alongside values
             * `annotations.errors[i]` is array of numbers,
             *   which correspond to a legend of the errors that have occurred at this index
             * For example
             * ```
             * "a": [
             *     "_$idx$_1_$end$_",
             *     2,
             *     "_$idx$_2, 3_$end$_",
             *     3,
             *     "_$idx$_4_$end$_",
             *     4
             *   ],
             * [1] "0" must be larger than or equal to 4
             * [2] "1" must be larger than or equal to 4
             * [3] "1" must be less than or equal to 2
             * [4] "2" must be less than or equal to 2
             * ```
             */
            const annotated = [];

            for (let i = 0; i < value.length; ++i) {
                if (annotations.errors[i]) {
                    annotated.push(`_$idx$_${annotations.errors[i].sort().join(', ')}_$end$_`);
                }

                annotated.push(value[i]);
            }

            return annotated;
        }

        Object.keys(annotations.errors).forEach((key) => {
            value[`${key}_$key$_${annotations.errors[key].sort().join(', ')}_$end$_`] = value[key];
            delete value[key];
        });

        Object.keys(annotations.missing).forEach((key) => {
            value[`_$miss$_${key}|${annotations.missing[key]}_$end$_`] = '__missing__';
        });

        return value;
    };
};
