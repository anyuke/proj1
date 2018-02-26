var request = require('request');

module.exports = {
    writeLog: function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'token,id,Access-Control-Allow-Headers,Origin,Accept,X-Requested-With,Content-Type,Access-Control-Request-Method,Access-Control-Request-Headers');
        logger.info('[请求][' + utils.getClientIp(req) + ']', req.method, req.originalUrl, req.method != 'GET' ? JSON.stringify(req.body) : '');
        return next();
    },

    checkEnv: function(req, res, next) {
        if (env.indexOf('test') == -1 && env.indexOf('dev') == -1) {
            return utils.response(res, {code: -1, message: '仅供调试使用'});
        }
        next();
    },

    checkToken: function(req, res, next) {
        if (!utils.isParamsNotEmpty([req.headers.id, req.headers.token])) {
            return utils.response(res, message.NEED_LOGIN);
        }
        var memberId = req.headers.id;
        var token = req.headers.token;
        var tokenKey = config.accessTokenPrefix + memberId;
        redisUtil.client().get(tokenKey, function(err, reply) {
            if (err) {
                logger.error(err);
                return utils.response(res, message.NEED_LOGIN);
            }
            if (!reply || reply != token) {
                return utils.response(res, message.NEED_LOGIN);
            }
            return next();
        });
    },

    checkLimit: function(req, res, next) {
        if (!utils.isStrNotEmpty(req.query.limit)) {
            req.query.limit = config.limit;
        }
        if (utils.isStrNotEmpty(req.query.lastIndex)) {
            req.query.lastIndex = parseInt(req.query.lastIndex);
        }
        req.query.limit = parseInt(req.query.limit);
        next();
    },

    verify: function(req, res, next) {
        var params = req.method == 'GET' ? req.query : req.body;
        var sign = params.sign;
        if (env.indexOf('-') >= 0) {
            delete params.sign;
            return next();
        }
        if (!utils.isStrNotEmpty(sign)) {
            return utils.response(res, {code: -1, message: '缺少签名参数'});
        }
        if (!utils.verify(config.publicKey, utils.link(utils.sort(utils.filter(params))), sign, 'RSA-MD5')) {
            return utils.response(res, {code: -1, message: '签名无效'});
        }
        delete params.sign;
        next();
    },

    getVerifyCode: function(req, res) {
        if (!utils.isValidMobileNum(req.query.mobileNum)) {
            return utils.response(res, message.INVALID_MOBILE);
        }
        if (!utils.isContains([1, 2], req.query.verifyType)) {
            return utils.response(res, {code: -1, message: '校验码类型错误'});
        }
        var mobileNum = req.query.mobileNum;
        var verifyType = parseInt(req.query.verifyType);
        var verifyCode = utils.randomNum();
        var verifyCodeKey = config.verifyCodePrefix + ['', 'REGISTER_', 'LOGIN_'][verifyType] + mobileNum;
        var sql = 'SELECT tb_member.id,tb_global_variate.value channel FROM tb_global_variate LEFT JOIN tb_member ON tb_member.mobileNum = ? WHERE tb_global_variate.key = ?';
        var params = [mobileNum, 'SMS_SEND_CHANNEL'];
        redisUtil.client().get('VERIFY_CODE_REQUEST_RESTRICTIONS_' + mobileNum, function(err, ret) {
            if (err) {
                logger.error(err);
                return utils.response(res, message.SYSTEM_ERROR);
            }
            if (ret) {
                return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
            }
            if (verifyType == 1) {
                mysqlUtil.execute(sql, params, function(err, results) {
                    if (err) {
                        logger.error(err);
                        return utils.response(res, message.SYSTEM_ERROR);
                    }
                    if (results && results[0].id > 0) {
                        return utils.response(res, {code: -1, message: '该手机号已被绑定'});
                    }
                    var channel = results[0].channel || 1;
                    redisUtil.client().get(verifyCodeKey, function(err, ret) {
                        if (ret) {
                            verifyCode = ret;
                        }
                        redisUtil.client().setex(verifyCodeKey, config.verifyCodeExpireTime, verifyCode);
                        redisUtil.client().setex('VERIFY_CODE_REQUEST_RESTRICTIONS_' + mobileNum, 65, verifyCode);
                        if (channel == 1) {
                            smsUtil.sendByAliyun(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[阿里]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                        else if (channel == 2) {
                            smsUtil.sendByYunTongXun(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[云通讯]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                        else if (channel == 3) {
                            smsUtil.sendByMxtong(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[麦讯通]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                    });
                });
            }
            else if (verifyType == 2) {
                mysqlUtil.execute(sql, params, function(err, results) {
                    if (err) {
                        logger.error(err);
                        return utils.response(res, message.SYSTEM_ERROR);
                    }
                    if (results && !results[0].id) {
                        return utils.response(res, {code: -1, message: '该手机号未注册'});
                    }
                    redisUtil.client().get(verifyCodeKey, function(err, ret) {
                        if (ret) {
                            verifyCode = ret;
                        }
                        var channel = results[0].channel || 1;
                        redisUtil.client().setex(verifyCodeKey, config.verifyCodeExpireTime, verifyCode);
                        redisUtil.client().setex('VERIFY_CODE_REQUEST_RESTRICTIONS_' + mobileNum, 65, verifyCode);
                        if (channel == 1) {
                            smsUtil.sendByAliyun(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[阿里]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                        else if (channel == 2) {
                            smsUtil.sendByYunTongXun(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[云通讯]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                        else if (channel == 3) {
                            smsUtil.sendByMxtong(verifyCode, mobileNum, function(err) {
                                if (err) {
                                    logger.error('[麦讯通]发送验证码 失败，手机号：' + mobileNum + '，错误：' + JSON.stringify(err));
                                    return utils.response(res, {code: -1, message: '验证码发送频繁，请稍后再试(支持1条/分钟，5条/小时 ，累计10条/天)'});
                                }
                                return utils.response(res, {code: 0, message: '验证码已发送到' + mobileNum + '手机上，' + parseInt(config.verifyCodeExpireTime / 60) + '分钟内输入有效'});
                            });
                        }
                    });
                });
            }
        });
    },

    checkVerifyCode: function(req, res) {
        if (!utils.isStrNotEmpty(req.body.verifyType)) {
            return utils.response(res, message.PARAMS_MISSING);
        }
        if (!utils.isValidMobileNum(req.query.mobileNum)) {
            return utils.response(res, message.INVALID_MOBILE);
        }
        if (!utils.isContains([1, 2], req.body.verifyType)) {
            return utils.response(res, {code: -1, message: '校验码类型错误'});
        }
        var mobileNum = req.body.mobileNum;
        var verifyCode = req.body.verifyCode;
        var verifyCodeKey = config.verifyCodePrefix + ['', 'REGISTER_', 'LOGIN_'][req.body.verifyType] + mobileNum;
        redisUtil.client().get(verifyCodeKey, function(err, ret) {
            if (err) {
                logger.error(err);
                return utils.response(res, message.SYSTEM_ERROR);
            }
            if (!ret) {
                return utils.response(res, {code: -1, message: '验证码失效'});
            }
            if (ret != verifyCode) {
                return utils.response(res, {code: -1, message: '验证码错误'});
            }
            redisUtil.client().del(verifyCodeKey);
            return utils.response(res, message.SUCCESS);
        });
    },

    weixinCode: function(req, res, next) {
        var args = req.method == 'GET' ? req.query : req.body;
        if (!utils.isStrNotEmpty(args.code) && !utils.isStrNotEmpty(args.userId)) {
            return utils.response(res, message.PARAMS_MISSING);
        }
        if (utils.isStrNotEmpty(args.userId)) {
            req.args = {userId: args.userId};
            return next();
        }
        var code = args.code;
        var accessToken, openid, unionid;
        async.series([
            function(callback) {
                var url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.third.weixin.appId + '&secret=' + config.third.weixin.appSecret + '&code=' + code + '&grant_type=authorization_code';
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-1', body);
                    body = JSON.parse(body);
                    openid = body.openid;
                    unionid = body.unionid;
                    accessToken = body.access_token;
                    callback();
                });
            },
            function(callback) {
                if (unionid) {
                    callback();
                    return;
                }
                var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + accessToken + '&openid=' + openid;
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-2', body);
                    body = JSON.parse(body);
                    unionid = body.unionid;
                    callback();
                });
            },
            function(callback) {
                req.args = {openid: openid, unionid: unionid};
                next();
                callback();
            },
            function(callback) {
                var sql = 'SELECT ' +
                    'tb_user.id userId,' +
                    'tb_user_mch_openid.userId exist ' +
                    'FROM ' +
                    'tb_user ' +
                    'LEFT JOIN tb_user_mch_openid ON tb_user_mch_openid.userId = tb_user.id ' +
                    'WHERE ' +
                    'tb_user.unionid = ?';
                var params = [unionid];
                mysqlUtil.execute(sql, params, function(err, results) {
                    if (err) {
                        logger.error(err);
                        callback();
                        return;
                    }
                    if (!results || results.length == 0) {
                        callback();
                        return;
                    }
                    if (results[0].exist) {
                        callback();
                        return;
                    }
                    var sql = 'INSERT INTO tb_user_mch_openid SET ?';
                    var params = [{userId: results[0].userId, appid: config.third.weixin.appId, mchid: config.third.weixin.mchId, openid: openid, unionid: unionid, createTime: new Date().getTime()}];
                    mysqlUtil.execute(sql, params);
                });
            }
        ]);
    },
    
    weixinCode2: function(req, res, next) {
        var args = req.method == 'GET' ? req.query : req.body;
        if (!utils.isStrNotEmpty(args.code)) {
            return next();
            //return utils.response(res, message.PARAMS_MISSING);
        }
        var code = args.code;
        var accessToken, openid, unionid;
        async.series([
            function(callback) {
                var url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.third.weixin.appId + '&secret=' + config.third.weixin.appSecret + '&code=' + code + '&grant_type=authorization_code';
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-1', body);
                    body = JSON.parse(body);
                    openid = body.openid;
                    unionid = body.unionid;
                    accessToken = body.access_token;
                    callback();
                });
            },
            function(callback) {
                var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + accessToken + '&openid=' + openid;
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-2', body);
                    body = JSON.parse(body);
                    unionid = body.unionid;
                    req.args = body;
                    req.args.openid = openid;
                    callback();
                });
            },
            function(callback) {
                next();
                callback();
            },
            function(callback) {
                var sql = 'SELECT ' +
                    'tb_user.id userId,' +
                    'tb_user_mch_openid.userId exist ' +
                    'FROM ' +
                    'tb_user ' +
                    'LEFT JOIN tb_user_mch_openid ON tb_user_mch_openid.userId = tb_user.id ' +
                    'WHERE ' +
                    'tb_user.unionid = ?';
                var params = [unionid];
                mysqlUtil.execute(sql, params, function(err, results) {
                    if (err) {
                        logger.error(err);
                        callback();
                        return;
                    }
                    if (!results || results.length == 0) {
                        callback();
                        return;
                    }
                    if (results[0].exist) {
                        callback();
                        return;
                    }
                    var sql = 'INSERT INTO tb_user_mch_openid SET ?';
                    var params = [{userId: results[0].userId, appid: config.third.weixin.appId, mchid: config.third.weixin.mchId, openid: openid, unionid: unionid, createTime: new Date().getTime()}];
                    mysqlUtil.execute(sql, params);
                });
            }
        ]);
    },
    
    weixinCodeQifu: function(req, res, next) {
        var args = req.method == 'GET' ? req.query : req.body;
        if (!utils.isStrNotEmpty(args.code) && !utils.isStrNotEmpty(args.id)) {
            return utils.response(res, message.PARAMS_MISSING);
        }
        if (utils.isStrNotEmpty(args.id)) {
            return next();
        }
        var code = args.code;
        var accessToken, openid, unionid;
        async.series([
            function(callback) {
                var url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.third.weixin.appId + '&secret=' + config.third.weixin.appSecret + '&code=' + code + '&grant_type=authorization_code';
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-1', body);
                    body = JSON.parse(body);
                    openid = body.openid;
                    unionid = body.unionid;
                    accessToken = body.access_token;
                    callback();
                });
            },
            function(callback) {
                var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + accessToken + '&openid=' + openid;
                request.get(url, function(err, rsp, body) {
                    if (err) {
                        logger.error(err);
                        callback('服务器开小差了，请稍后再试');
                        return;
                    }
                    logger.debug('weixinCode-2', body);
                    body = JSON.parse(body);
                    unionid = body.unionid;
                    req.args = body;
                    req.args.openid = openid;
                    callback();
                });
            },
            function(callback) {
                //req.args = {openid: openid, unionid: unionid};
                next();
                callback();
            },
            function(callback) {
                var sql = 'SELECT ' +
                    'tb_user.id userId,' +
                    'tb_user_mch_openid.userId exist ' +
                    'FROM ' +
                    'tb_user ' +
                    'LEFT JOIN tb_user_mch_openid ON tb_user_mch_openid.userId = tb_user.id ' +
                    'WHERE ' +
                    'tb_user.unionid = ?';
                var params = [unionid];
                mysqlUtil.execute(sql, params, function(err, results) {
                    if (err) {
                        logger.error(err);
                        callback();
                        return;
                    }
                    if (!results || results.length == 0) {
                        callback();
                        return;
                    }
                    if (results[0].exist) {
                        callback();
                        return;
                    }
                    var sql = 'INSERT INTO tb_user_mch_openid SET ?';
                    var params = [{userId: results[0].userId, appid: config.third.weixin.appId, mchid: config.third.weixin.mchId, openid: openid, unionid: unionid, createTime: new Date().getTime()}];
                    mysqlUtil.execute(sql, params);
                });
            }
        ]);
    },
    
    playerInfo: function(req, res) {
        if (!utils.isParamsNotEmpty([req.args.unionid])) {
            return utils.response(res, message.PARAMS_MISSING);
        }
        mysqlUtil.execute('SELECT id userId,loginCode token,nickname FROM tb_user WHERE unionid = ?', [req.args.unionid], function(err, results) {
            if (err) {
                logger.error(err);
                return utils.response(res, message.SYSTEM_ERROR);
            }
            if (!results || results.length == 0) {
                return utils.response(res, {code: 1001, message: '用户不存在'});
            }
            return utils.response(res, {code: 0, message: 'success', data: results[0]});
        });
    },

    checkPage: function(req, res, next) {
        if (!utils.isStrNotEmpty(req.query.pageNum)) {
            req.query.pageNum = config.pageNum;
        }
        if (!utils.isStrNotEmpty(req.query.index)) {
            req.query.index = 1;
        }
        req.query.pageNum = parseInt(req.query.pageNum);
        req.query.index = parseInt(req.query.index);
        next();
    }
};