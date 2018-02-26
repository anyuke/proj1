var fs = require('fs');
var path = require('path');
var log4js = require('log4js');
var level = 'INFO';
var filePath = '/root/logs/member';
if (!process.env.NODE_ENV || process.env.NODE_ENV.indexOf('test') >= 0 || process.env.NODE_ENV.indexOf('dev') >= 0) {
    level = 'DEBUG';
    filePath = rootdir + '/logs';
}
(function work(fullPath) {
    if (fs.existsSync(fullPath)) {
        return true;
    }
    else {
        if (work(path.dirname(fullPath))) {
            fs.mkdirSync(fullPath);
            return true;
        }
    }
})(filePath);
log4js.configure({
    appenders: [
        {type: 'console'},
        {type: 'dateFile', filename: filePath, pattern: '/yyyyMMdd.txt', absolute: true, alwaysIncludePattern: true, category: 'fileLog'}
    ],
    replaceConsole: true,
    lineDebug: true
});
var logger = log4js.getLogger('fileLog');
logger.setLevel(level);
module.exports = logger;