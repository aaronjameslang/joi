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
    } = processErrors(errs);
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

const processErrors = function (errs_, parent, overrideMessage, context) {

    context = context || new Context();
    // Construct error

    for (let i = 0; i < errs_.length; ++i) {
        const err = errs_[i];

        if (err instanceof Error) {
            return context.withOverride(err);
        }

        if (err.flags.error && typeof err.flags.error !== 'function') {
            return context.withOverride(err.flags.error);
        }

        let itemMessage;
        if (parent === undefined) {
            itemMessage = err.toString();
            context.appendMessage(itemMessage);
        }

        // Do not push intermediate errors, we're only interested in leafs

        if (err.context.reason && err.context.reason.length) {
            processErrors(err.context.reason, err.path, err.type === 'override' ? err.message : null, context);
            if (context.override) {
                return context;
            }
        }
        else {
            context.appendDetail({
                message: overrideMessage || itemMessage || err.toString(),
                path: err.path,
                type: err.type,
                context: err.context
            });
        }
    }

    return context;
};
