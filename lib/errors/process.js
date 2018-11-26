'use strict';

const ValidationError = require('./ValidationError');

/**
 * This functions accepts an array of Errs,
 *   each of which may contain child errs (i.e. err.context.reason)
 *   forming a tree of Errs
 *
 * This tree of Errs is reduced to a single Error and returned
 *
 * @param {Err[]} errs The errs to be reduced into a single Error
 * @param {Object} object The object to be validated
 * @return {Error|ValidationError|null} The single summary Error
 */
module.exports = function (errs, object) {

    if (!errs || !errs.length) {
        return null;
    }

    return reduceErrors(new Accumulator(), errs).buildError(object);
};

/**
 * Reduce an array of Errs to an Accumulator
 * @param {Accumulator} initialAcc
 * @param {Err[]} errs
 * @param {Err} [parent]
 * @return {Accumulator} The summary of the errs
 */
const reduceErrors = function (initialAcc, errs, parent) {

    return errs.reduce((acc, err) => reduceError(acc, err, parent), initialAcc);
};

/**
 * Reduce the data from err into the accumulator,
 *   including any children if present
 * @param err {Error|Err}
 * @param acc {Accumulator}
 * @param parent {Err}
 * @return {Accumulator}
 */
const reduceError = function (acc, err, parent) {

    if (err instanceof Error) {
        return acc.withOverrideError(err);
    }

    if (err.flags.error instanceof Error) {
        return acc.withOverrideError(err.flags.error);
    }

    // If err has a parent, include this err's message
    const acc2 = parent ? acc : acc.withMessage(err.toString());

    if (err.context.reason) {
        // If err has children, reduce them
        //   don't use details from this intermediate err
        return reduceErrors(
            acc2,
            err.context.reason, // the children of this err
            err, // this err, the parent of it's children
        );
    }

    // If err has no children,
    //   include it's details in the accumulated error
    const overrideMessage = parent && parent.type === 'override' && parent.message;
    return acc2.withErrDetail(err, overrideMessage);
};

/**
 * The accumulator stores data to be used in building the final error
 * This class could be consider an ErrorBuilder
 */
class Accumulator {
    constructor(details, messages, override) {

        this._details = details || [];
        this._messages = messages || [];
        this._override = override || undefined;
    }

    /**
     * @param {Err} err The Err to extract details from
     * @param {string} overrideMessage
     * @return {Accumulator}
     */
    withErrDetail(err, overrideMessage) {

        const detail = {
            context: err.context,
            message: overrideMessage || err.toString(),
            path: err.path,
            type: err.type
        };
        return new Accumulator(
            this._details.concat(detail),
            this._messages,
            this._override,
        );
    }

    /**
     * @param {string} message
     *   One part of the message of the final built error
     * @return {Accumulator}
     */
    withMessage(message) {

        return new Accumulator(
            this._details,
            this._messages.concat(message),
            this._override
        );
    }

    /**
     * @param {Error} override
     *   This will override the normal buildError behaviour
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
     * Build an error based on the accumulated data
     * This is the ultimate purpose of the Accumulator
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

