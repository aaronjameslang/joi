'use strict';

const Annotate = require('./annotate');

class ValidationError extends Error {
    constructor(message, details, object) {

        super(message); // TODO is this message ever used?
        this._object = object;
        this.details = details;
    }

    set messagePrefix(messagePrefix) {

        // if (this._messagePrefix) { // TODO coverage
        //     throw new Error('Message prefix cannot be reset');
        // }

        this._messagePrefix = messagePrefix;
        const annotated = Annotate.call(this);
        this.message = this._messagePrefix ?
            `${this._messagePrefix} ${annotated}` :
            annotated;
    }
}

;

ValidationError.prototype.annotate = Annotate;

ValidationError.prototype.isJoi = true;

ValidationError.prototype.name = 'ValidationError';

module.exports = ValidationError;
