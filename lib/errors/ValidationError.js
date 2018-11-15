'use strict';

const Annotate = require('./annotate');

class ValidationError extends Error {
    constructor(message, details, object) {

        super(message);
        this._object = object;
        this.details = details;
    }
}

;

ValidationError.prototype.annotate = Annotate;

ValidationError.prototype.isJoi = true;

ValidationError.prototype.name = 'ValidationError';

module.exports = ValidationError;
