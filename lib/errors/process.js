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

class Accumulator {
    constructor(details, messages, override) {
        this._details = details || [];
        this._messages = messages || [];
        this._override = override || undefined;
    }

    withOverride(override) {
        if (!(override instanceof Error)) {
            throw new Error('override must be an Error')
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

    withMessage(message) {
        // return new Accumulator(
        //     this._details,
        //     this._messages.concat(message),
        //     this._override
        // );

        this._messages = [...this._messages, message];
        return this;
    }

    withDetail(detail) {
        this._details = this._details.concat(detail);
        return this;
    }

    buildError(object) {
       if (this._override) return this._override;
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
    if (err instanceof Error) {
        return acc.withOverride(err);
    }

    if (err.flags.error instanceof Error) {
        return acc.withOverride(err.flags.error);
    }

    const context2 = parent ? acc : acc.withMessage(err.toString());

    if (err.context.reason) {
        // If err has children, reduce them
        //   don't use details from intermediate errs
        return reduceErrors(err.context.reason, context2, err.path, err.type === 'override' ? err.message : null);
    }

    return context2.withDetail({
        message: overrideMessage || err.toString(),
        path: err.path,
        type: err.type,
        context: err.context
    });
};

