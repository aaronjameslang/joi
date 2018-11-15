'use strict';

const Hoek = require('hoek');
const Language = require('../language');

class Err {

    constructor(type, context, state, options, flags, message, template) {

        this.isJoi = true;
        this.type = type;
        this.context = context || {};
        this.context.key = state.path[state.path.length - 1];
        this.context.label = state.key;
        this.path = state.path;
        this.options = options;
        this.flags = flags;
        this.message = message;
        this.template = template;

        const localized = this.options.language;

        if (this.flags.label) {
            this.context.label = this.flags.label;
        }
        else if (localized &&                   // language can be null for arrays exclusion check
            (this.context.label === '' ||
            this.context.label === null)) {
            this.context.label = localized.root || Language.errors.root;
        }
    }

    toString() {

        if (this.message) {
            return this.message;
        }

        let format;

        if (this.template) {
            format = this.template;
        }

        const localized = this.options.language;

        format = format || Hoek.reach(localized, this.type) || Hoek.reach(Language.errors, this.type);

        if (format === undefined) {
            return `Error code "${this.type}" is not defined, your custom type is missing the correct language definition`;
        }

        let wrapArrays = Hoek.reach(localized, 'messages.wrapArrays');
        if (typeof wrapArrays !== 'boolean') {
            wrapArrays = Language.errors.messages.wrapArrays;
        }

        if (format === null) {
            const childrenString = internals.stringify(this.context.reason, wrapArrays);
            if (wrapArrays) {
                return childrenString.slice(1, -1);
            }

            return childrenString;
        }

        const hasKey = /\{\{\!?label\}\}/.test(format);
        const skipKey = format.length > 2 && format[0] === '!' && format[1] === '!';

        if (skipKey) {
            format = format.slice(2);
        }

        if (!hasKey && !skipKey) {
            const localizedKey = Hoek.reach(localized, 'key');
            if (typeof localizedKey === 'string') {
                format = localizedKey + format;
            }
            else {
                format = Hoek.reach(Language.errors, 'key') + format;
            }
        }

        const message =  format.replace(/\{\{(\!?)([^}]+)\}\}/g, ($0, isSecure, name) => {

            const value = Hoek.reach(this.context, name);
            const normalized = internals.stringify(value, wrapArrays);
            return (isSecure && this.options.escapeHtml ? Hoek.escapeHtml(normalized) : normalized);
        });

        this.toString = () => message;  // Persist result of last toString call, it won't change

        return message;
    }

};

module.exports = function (type, context, state, options, flags, message, template) {

    return new Err(type, context, state, options, flags, message, template);
};

