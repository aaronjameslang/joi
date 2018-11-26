'use strict';

const Err = require('./Err');
const ValidationError = require('./ValidationError');

/**
 *
 * @param {Err[]} errs
 * @param object
 * @return {Error|ValidationError|null} errors
 */
module.exports = function (errs, object) {

    if (!errs || !errs.length) {
        return null;
    }

    return reduceErrors(errs, new Accumulator()).buildError(object);
};

/**
 * Accumulator
 *
 * * details
 *
 * * messages
 *
 * * override
 */
class Accumulator {
    constructor(details, messages, override) {
        this._details = details || [];
        this._messages = messages || [];
        this._override = override || undefined;
    }

    /**
     * @param override {Error}
     * @return {Accumulator}
     */
    withOverride(override) {
        if (!(override instanceof Error)) {
            throw new Error('override must be an Error');
        }

        if (this._override) {
            throw new Error('override already set');
        }

        return new Accumulator(
            this._details,
            this._messages,
            override
        );
    }

    /**
     * @param message {string}
     * @return {Accumulator}
     */
    withMessage(message) {
        // return new Accumulator(
        //     this._details,
        //     this._messages.concat(message),
        //     this._override
        // );

        this._messages = [...this._messages, message];
        return this;
    }

    /**
     * @param err {Err}
     * @param overrideMessage {string}
     * @return {Accumulator}
     */
    withErrDetail(err, overrideMessage) {
        this._details = this._details.concat({
            context: err.context,
            message: overrideMessage || err.toString(),
            path: err.path,
            type: err.type
        });
        return this;
    }

    /**
     * Build an error based on the accumulated data
     * This is the ultimate purpose of the Accumlator
     *
     * @param object
     * @return {ValidationError|Error}
     */
    buildError(object) {
        if (this._override) {
            return this._override;
        }

        const message = this._messages.join('. ');
        return new ValidationError(message, this._details, object);
    }
}

const reduceErrors = function (errs, acc, parent, overrideMessage) {
    return errs.reduce((currentAcc, err) => reduceError(err, acc, parent, overrideMessage), acc);
};

/**
 * @param err {Error|Err}
 * @param acc {Accumulator}
 * @param parent ??? parentErr.path?
 * @param overrideMessage {string} optional
 * @return {Accumulator}
 */
const reduceError = function (err, acc, parent, overrideMessage) {
    // if (parent && (parent.length !== 0) && !('string' == typeof parent[0]) && !('number' == typeof parent[0])) {
    //     console.log('parent', parent)
    // }
    if (err instanceof Error) {
        return acc.withOverride(err);
    }

    if (err.flags.error instanceof Error) {
        return acc.withOverride(err.flags.error);
    }

    const acc2 = parent ? acc : acc.withMessage(err.toString());

    if (err.context.reason) {
        // If err has children, reduce them
        //   don't use details from intermediate errs
        if (!err.path) {
            console.log('err but no err.path')
        }
        const childErrs = err.context.reason;
        return reduceErrors(childErrs, acc2, err, err.type === 'override' ? err.message : null);
    }

    // If err has no children, include it's details in the accumulated error
    return acc2.withErrDetail(err, overrideMessage);
};

