const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const express = require('express');
const excelExport = require('excel-export');
module.exports = {
	loadModules: function(path) {
        var modules = {};
        var work = function(path) {
            var files = fs.readdirSync(path);
            files.forEach(function(item) {
                var tmpPath = path + '/' + item;
                var stats = fs.statSync(tmpPath);
                if (item[0] == '.') {
                    return;
                }
                if (stats.isDirectory()) {
                    work(tmpPath, item);
                }
                else {
                    item = item.split('.')[0];
                    modules[item] = require(tmpPath);
                }
            });
        };
        work(path);
        return modules;
    },

    loadRoutes: function(path) {
        var routers = {};
        var work = function(path, parent) {
            var files = fs.readdirSync(path);
            files.forEach(function(item) {
                var tmpPath = path + '/' + item;
                var stats = fs.statSync(tmpPath);
                if (item[0] == '.') {
                    return;
                }
                if (stats.isDirectory()) {
                    routers[item] = express();
                    try {
                        routers[item] = require(tmpPath + '/index');
                    }
                    catch (err) {
                    }
                    work(tmpPath, item);
                }
                else if (parent != '') {
                    item = item.split('.')[0];
                    routers[parent].use('/' + item, require(tmpPath));
                }
                else {
                    item = item.split('.')[0];
                    if (item != 'index') {
                        routers[item] = require(tmpPath);
                    }
                }
            });
        };
        work(path, '');
        return routers;
    },

	getClientIp: function(req) {
        var ipAddress;
        var clientIp = req.headers['x-client-ip'];
        var forwardedForAlt = req.headers['x-forwarded-for'];
        var realIp = req.headers['x-real-ip'];
        var clusterClientIp = req.headers['x-cluster-client-ip'];
        var forwardedAlt = req.headers['x-forwarded'];
        var forwardedFor = req.headers['forwarded-for'];
        var forwarded = req.headers['forwarded'];
        if (clientIp) {
            ipAddress = clientIp;
        }
        else if (forwardedForAlt) {
            var forwardedIps = forwardedForAlt.split(',');
            ipAddress = forwardedIps[0];
        }
        else if (realIp) {
            ipAddress = realIp;
        }
        else if (clusterClientIp) {
            ipAddress = clusterClientIp;
        }
        else if (forwardedAlt) {
            ipAddress = forwardedAlt;
        }
        else if (forwardedFor) {
            ipAddress = forwardedFor;
        }
        else if (forwarded) {
            ipAddress = forwarded;
        }
        if (!ipAddress) {
            try {
                ipAddress = req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || null;
            }
            catch (e) {
                ipAddress = null;
            }
        }
        return ipAddress;
    },

	response: function(res, data) {
        res.send({code: data.code, message: data.message, env: env, data: data.data});
        logger.info('[响应][' + this.getClientIp(res.req) + ']', JSON.stringify({code: data.code, message: data.message, env: env, data: data.data}));
    }
}