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
    withOverrideError(override) {
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

const reduceErrors = function (errs, acc, parent) {
    return errs.reduce((currentAcc, err) => reduceError(err, acc, parent), acc);
};

/**
 * @param err {Error|Err}
 * @param acc {Accumulator}
 * @param parent {Err}
 * @return {Accumulator}
 */
const reduceError = function (err, acc, parent) {
    if (err instanceof Error) {
        return acc.withOverrideError(err);
    }

    if (err.flags.error instanceof Error) {
        return acc.withOverrideError(err.flags.error);
    }

    // If err has a parent, include it's message
    const acc2 = parent ? acc : acc.withMessage(err.toString());

    if (err.context.reason) {
        // If err has children, reduce them
        //   don't use details from this intermediate err
        return reduceErrors(
            err.context.reason, // the children of this err
            acc2,
            err, // this err, the parent of it's children
        );
    }

    // If err has no children,
    //   include it's details in the accumulated error
    const overrideMessage = parent && parent.type === 'override' && parent.message;
    return acc2.withErrDetail(err, overrideMessage);
};

