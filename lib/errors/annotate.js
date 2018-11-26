'use strict';

const Hoek = require('hoek');
const ANNOTATIONS = require('./annotations');
const SafeStringify = require('./safeStringify');

/**
 * A method of ValidationError
 *
 * `this` is a ValidationError
 *
 * @param stripColorCodes Unused ??
 * @return {string}
 */
module.exports = function annotate(stripColorCodes /* TODO this is never used*/) {

    const redFgEscape = stripColorCodes ? '' : '\u001b[31m';
    const redBgEscape = stripColorCodes ? '' : '\u001b[41m';
    const endColor = stripColorCodes ? '' : '\u001b[0m';

    if (typeof this._object !== 'object') {
        return this.details[0].message;
    }

    const obj = Hoek.clone(this._object || {});

    for (let i = this.details.length - 1; i >= 0; --i) {        // Reverse order to process deepest child first
        const pos = i + 1;
        const error = this.details[i];
        const path = error.path;
        let ref = obj;
        for (let j = 0; ; ++j) {
            const seg = path[j];

            if (ref.isImmutable) {
                ref = ref.clone();                              // joi schemas are not cloned by hoek, we have to take this extra step
            }

            if (j + 1 < path.length &&
                ref[seg] &&
                typeof ref[seg] !== 'string') {

                ref = ref[seg];
            }
            else {
                const refAnnotations = ref[ANNOTATIONS] = ref[ANNOTATIONS] || { errors: {}, missing: {} };
                const value = ref[seg];
                const cacheKey = seg || error.context.label;

                if (value !== undefined) {
                    refAnnotations.errors[cacheKey] = refAnnotations.errors[cacheKey] || [];
                    refAnnotations.errors[cacheKey].push(pos);
                }
                else {
                    refAnnotations.missing[cacheKey] = pos;
                }

                break;
            }
        }
    }

    // "a": [
    //     "_$idx$_1_$end$_",
    //     2,
    //     "_$idx$_2, 3_$end$_",
    //     3,
    //     "_$idx$_4_$end$_",
    //     4
    //   ],
    // [1] "0" must be larger than or equal to 4
    // [2] "1" must be larger than or equal to 4
    // [3] "1" must be less than or equal to 2
    // [4] "2" must be less than or equal to 2
    // becomes
    // "a": [
    //     2, [1]
    //     3, [2, 3]
    //     4 [4]
    //   ],
    // [1] "0" must be larger than or equal to 4
    // [2] "1" must be larger than or equal to 4
    // [3] "1" must be less than or equal to 2
    // [4] "2" must be less than or equal to 2

    // {
    //   "_$miss$_value|1_$end$_": "__missing__"
    // }
    // [1] "value" must be a string[0m
    // becomes
    // {
    //   "value"[1]: -- missing --
    // }
    // [1] "value" must be a string

    // {
    //   "a_$key$_1, 2_$end$_": "{\"b\":-1.5}"
    // }
    //
    // [1] "b" must be an integer
    // [2] "b" must be a positive number
    // becomes
    // {
    //   "a" [1, 2]: "{\"b\":-1.5}"
    // }
    //
    // [1] "b" must be an integer
    // [2] "b" must be a positive number
    const replacers = {
        key: /_\$key\$_([, \d]+)_\$end\$_\"/g,
        missing: /\"_\$miss\$_([^\|]+)\|(\d+)_\$end\$_\"\: \"__missing__\"/g,
        arrayIndex: /\s*\"_\$idx\$_([, \d]+)_\$end\$_\",?\n(.*)/g
    };

    let message = SafeStringify(obj, 2)
        .replace(replacers.arrayIndex, ($0, $1, $2) => `\n${$2} ${redFgEscape}[${$1}]${endColor}`)
        .replace(replacers.key, ($0, $1) =>                  `" ${redFgEscape}[${$1}]${endColor}`)
        .replace(replacers.missing, ($0, $1, $2) =>            `${redBgEscape}"${$1}"${endColor}` +
                                                               `${redFgEscape} [${$2}]: -- missing --${endColor}`)
    ;

    /**
     * SafeStringify returns valid json,
     *   so must convert some unsafe values to strings like
     *   "[NaN]", "[Symbol(X)]", "[Infinity]", "[function () {}]", "[(a) => a]"
     * Here we unwrap these strings to show that they were originally special values
     *   "[NaN]" becomes NaN, "[Symbol(X)]" becomes Symbol(x), etc.
     */
    message = message.replace(/"\[(NaN|Symbol.*|-?Infinity|function.*|\(.*)\]"/g, ($0, $1) => $1);

    message = [
        message,
        redFgEscape,
        ...this.details.map((d, i) => `[${i + 1}] ${this.details[i].message}`)
    ].join('\n');

    message = message + endColor;

    return message;
};
