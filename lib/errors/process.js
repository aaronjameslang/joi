'use strict';

const Err = require('./Err');
const fs = require('fs');
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
    } = processErrors(errs, new Context());
    if (override) {
        return override;
    }

    return new ValidationError(message, details, object);
};

class Context {
    constructor(details, messages, override) {
        this.details = details || [];
        this.messages = messages || [];
        this.override = override || undefined;
    }

    withOverride(override) {
        if (this.override) {
            throw new Error('override already set');
        }

        this.override = override;
        return this;
    }

    withMessage(message) {
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

const processErrors = function (errs, context, parent, overrideMessage) {
    errs.forEach((err) => processError(err, context, parent, overrideMessage));
    return context;
};

const processError = function (err, context, parent, overrideMessage) {
    if (err instanceof Error) {
        return context.withOverride(err);
    }

    if (err.flags.error instanceof Error) {
        return context.withOverride(err.flags.error);
    }

    const context2 = parent ? context : context.withMessage(err.toString());

    // Do not push intermediate errors, we're only interested in leafs
    if (err.context.reason) {
        return processErrors(err.context.reason, context2, err.path, err.type === 'override' ? err.message : null);
    }

    return context2.withDetail({
        message: overrideMessage || err.toString(),
        path: err.path,
        type: err.type,
        context: err.context
    });
};

