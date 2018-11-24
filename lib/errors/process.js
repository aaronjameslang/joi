'use strict';

const Err = require('./Err');

const ValidationError = require('./ValidationError');

/**
 *
 * @param errs
 * @param object
 * @return Error[]|null errors
 */
module.exports = function (errs, object) {

    if (!errs || !errs.length) {
        return null;
    }

    if (errs.some((e) => !(e instanceof Err))) {
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
    constructor() {
        this.details = [];
        this.message = '';
        this.override = undefined;
    }

    withOverride(override) {
        this.override = override;
        return this;
    }

    appendMessage(message) {
        this.message = this.message + (this.message ? '. ' : '') + message;
    }

    appendDetail(detail) {
        this.details.push(detail);
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

    if (err.flags.error && typeof err.flags.error !== 'function') {
        return context.withOverride(err.flags.error);
    }

    if (parent === undefined) {
        context.appendMessage(err.toString());
    }

    // Do not push intermediate errors, we're only interested in leafs

    if (err.context.reason && err.context.reason.length) {
        processErrors(err.context.reason, context, err.path, err.type === 'override' ? err.message : null);
        if (context.override) {
            return context;
        }
    }
    else {
        context.appendDetail({
            message: overrideMessage || err.toString(),
            path: err.path,
            type: err.type,
            context: err.context
        });
    }
};

