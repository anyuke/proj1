require('./init');
var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(rootdir + '/web'));
app.use(favicon(rootdir + '/web/images/favicon.png'));
app.use('*', modules.common.writeLog);

for (var i in routes) {
    app.use('/' + i, routes[i]);
}
app.use(function(req, res) {
    logger.debug("%s %s Not Found", req.method, req.path);
    return res.redirect('/html/index.html');
});
app.listen(config.port, '0.0.0.0', function() {
    logger.info('server listening at port ' + config.port);
});