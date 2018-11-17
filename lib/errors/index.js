'use strict';

const Err = require('./Err');
const Process = require('./process');

exports.process = Process;

exports.create = function (type, context, state, options, flags, message, template) {

    return new Err(type, context, state, options, flags, message, template);
};

exports.Err = Err;
