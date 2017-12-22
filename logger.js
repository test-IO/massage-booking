const winston = require('winston');

winston.level = process.env.LOG_LEVEL;

module.exports = winston;
