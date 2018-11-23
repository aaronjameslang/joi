'use strict';

const Err = require('./Err');

const ValidationError = require('./ValidationError');

module.exports = function (errs, object) {

    if (!errs || !errs.length) {
        return null;
    }

    if (errs.some((e) => !(e instanceof Err))) {
        throw new Error('Expected Err[]');
    }

    // Construct error

    let message = '';
    const details = [];

    const processErrors = function (errs_, parent, overrideMessage) {

        for (let i = 0; i < errs_.length; ++i) {
            const err = errs_[i];

            if (err instanceof Error) {
                return err;
            }

            if (err.flags.error && typeof err.flags.error !== 'function') {
                return err.flags.error;
            }

            let itemMessage;
            if (parent === undefined) {
                itemMessage = err.toString();
                message = message + (message ? '. ' : '') + itemMessage;
            }

            // Do not push intermediate errors, we're only interested in leafs

            if (err.context.reason && err.context.reason.length) {
                const override = processErrors(err.context.reason, err.path, err.type === 'override' ? err.message : null);
                if (override) {
                    return override;
                }
            }
            else {
                details.push({
                    message: overrideMessage || itemMessage || err.toString(),
                    path: err.path,
                    type: err.type,
                    context: err.context
                });
            }
        }
    };

    const override = processErrors(errs);
    if (override) {
        return override;
    }

    return new ValidationError(message, details, object);
};
