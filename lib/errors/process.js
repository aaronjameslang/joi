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

    if (errs.some((e) => !(e instanceof Err))) { // TODO
        throw new Error('Expected Err[]');
    }

    const {
        details,
        message,
        override
    } = reduceErrors(errs, new Accumulator());
    if (override) {
        return override;
    }

    return new ValidationError(message, details, object);
};

class Accumulator {
    constructor(details, messages, override) {
        this.details = details || [];
        this.messages = messages || [];
        this.override = override || undefined;
    }

    withOverride(override) {
        if (this.override) {
            throw new Error('override already set');
        }

        return new Accumulator(
            this.details,
            this.messages,
            override
        );
    }

    withMessage(message) {
        // return new Accumulator(
        //     this.details,
        //     this.messages.concat(message),
        //     this.override
        // );

        this.messages = this.messages.concat(message);
        return this;
    }

    get message() {
        return this.messages.join('. ');
    }

    withDetail(detail) {
        this.details = this.details.concat(detail);
        return this;
    }
}

const reduceErrors = function (errs, acc, parent, overrideMessage) {
    // The errs array is sliced here to make a cheap shallow copy,
    //   this allows us to safely splice later
    return errs.reduce((currentAcc, err) => reduceError(err, acc, parent, overrideMessage), acc);
};

/**
 * @param err
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

    // Do not push intermediate errors, we're only interested in leafs
    if (err.context.reason) {
        return reduceErrors(err.context.reason, context2, err.path, err.type === 'override' ? err.message : null);
    }

    return context2.withDetail({
        message: overrideMessage || err.toString(),
        path: err.path,
        type: err.type,
        context: err.context
    });
};

