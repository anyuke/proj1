var mysql = require('mysql');
var async = require('async');
var pool = mysql.createPool(config.mysql);

module.exports = {
    getConnection: function(callback) {
        if (typeof callback != 'function') {
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        pool.getConnection(callback);
    },

    execute: function(sql, params, callback) {
        if (typeof sql != 'string' || !Array.isArray(params)) {
            if (callback) callback('参数错误');
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        pool.getConnection(function(err, conn) {
            if (err) {
                if (callback) callback(err, null);
                return;
            }
            conn.query(sql, params, function(err, results) {
                conn.release();
                if (callback) callback(err, results);
            });
        });
    },

    /**
     * 执行sql数组
     * @param args [{sql:'',params:[]},{sql:'',params:[]}]
     * @param callback
     */
    executeMulti: function(args, callback) {
        if (!Array.isArray(args)) {
            if (callback) callback('参数错误');
            return;
        }
        if (args.length == 0) {
            if (callback) callback('参数错误');
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        var data = [];
        pool.getConnection(function(err, conn) {
            if (err) {
                if (callback) callback(err);
                return;
            }
            async.forEachSeries(args, function(item, cb) {
                conn.query(item.sql, item.params, function(err, results) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    data.push(results);
                    cb();
                });
            }, function(err) {
                conn.release();
                if (callback) callback(err, data);
            });
        });
    },

    /**
     * 事务执行顺序执行sql数组
     * @param args [{sql:'',params:[]},{sql:'',params:[]}]
     * @param callback
     */
    executeMultiSafe: function(args, callback) {
        if (typeof callback != 'function') {
            return;
        }
        if (!Array.isArray(args)) {
            callback('参数错误');
            return;
        }
        if (args.length == 0) {
            callback('参数错误');
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        var data = [];
        pool.getConnection(function(err, conn) {
            if (err) {
                callback(err, null);
                return;
            }
            conn.beginTransaction(function(err) {
                if (err) {
                    conn.release();
                    return callback(err);
                }
                async.forEachSeries(args, function(item, cb) {
                    conn.query(item.sql, item.params, function(err, results) {
                        if (err) {
                            cb(err);
                            return;
                        }
                        data.push(results);
                        cb();
                    });
                }, function(err) {
                    if (err) {
                        conn.rollback();
                        conn.release();
                        callback(err, data);
                    }
                    conn.commit(function(err) {
                        if (err) {
                            conn.rollback();
                        }
                        conn.release();
                        callback(err, data);
                    });
                });
            });
        });
    },

    executeArray: function(sqls, params, callback) {
        if (typeof callback != 'function') {
            return;
        }
        if (!Array.isArray(sqls) || !Array.isArray(params)) {
            callback('参数错误');
            return;
        }
        if (sqls.length == 0 || params.length == 0) {
            callback('参数错误');
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        pool.getConnection(function(err, conn) {
            if (err) {
                if (callback) {
                    return callback(err, []);
                }
                return false;
            }
            var data = [];
            (function work(i) {
                if (i == sqls.length) {
                    conn.release();
                    callback(null, data);
                    return;
                }
                conn.query(sqls[i], params[i], function(err, results) {
                    if (err) {
                        conn.release();
                        callback(err);
                        return;
                    }
                    data.push(results);
                    i++;
                    work(i);
                });
            })(0);
        });
    },

    query_page: function(sql, from_idx, to_idx, params, callback) {
        if (!utils.isNumOrStrNum(from_idx) || !utils.isNumOrStrNum(to_idx)) {
            callback(new Error('param error'));
            return;
        }
        if (typeof (sql) != 'string') {
            callback(new Error('param error'));
            return;
        }
        if (typeof (callback) != 'function') {
            throw new Error('system error');
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        pool.getConnection(function(err, conn) {
            if (err) {
                if (callback) {
                    return callback(err, null);
                }
                return false;
            }
            var sql_count = 'SELECT COUNT(1)cnt FROM (' + sql + ')tab_page';
            conn.query(sql_count, params, function(err, results1) {
                if (err) {
                    conn.release();
                    if (callback) callback(err);
                    return;
                }
                var sql_page = sql + ' LIMIT ' + from_idx + ' , ' + (to_idx - from_idx);
                conn.query(sql_page, params, function(err, results) {
                    conn.release();
                    if (callback) {
                        return callback(err, results, results1[0].cnt);
                    }
                });
            });
        });
    },

    executeArraySafe: function(sqls, params, callback) {
        if (typeof callback != 'function') {
            return;
        }
        if (!Array.isArray(sqls) || !Array.isArray(params)) {
            callback('参数错误');
            return;
        }
        if (sqls.length == 0 || params.length == 0) {
            callback('参数错误');
            return;
        }
        var data = [];
        pool.getConnection(function(err, conn) {
            if (err) {
                callback(err);
                return;
            }
            conn.beginTransaction(function(err) {
                if (err) {
                    conn.release();
                    return callback(err, []);
                }
                (function work(i) {
                    if (i == sqls.length) {
                        conn.commit(function(err) {
                            if (err) {
                                conn.rollback();
                                conn.release();
                                callback(err);
                                return;
                            }
                            conn.release();
                            callback(null, data);
                        });
                        return;
                    }
                    conn.query(sqls[i], params[i], function(err, results) {
                        if (err) {
                            conn.rollback();
                            conn.release();
                            callback(err);
                            return;
                        }
                        data.push(results);
                        i++;
                        work(i);
                    });
                })(0);
            });
        });
    },

    executeArraySafe2: function(sqls, params, eachCallback, callback) {
        if (typeof (callback) != 'function') {
            throw new Error('system error');
        }
        if (!(sqls instanceof Array) || !(params instanceof Array)) {
            callback(new Error('param error'));
            return;
        }
        if (pool === null) {
            pool = mysql.createPool(config.mysql);
        }
        pool.getConnection(function(err, conn) {
            if (err) {
                if (callback) {
                    return callback(err, []);
                }
                return false;
            }
            conn.beginTransaction(function(err) {
                if (err) {
                    conn.release();
                    return callback(err, []);
                }
                (function(idx, results) {
                    function next(err, result) {
                        if (err) {
                            conn.rollback();
                            conn.release();
                            callback(err, results);
                            return;
                        }
                        idx++;
                        if (idx >= 1) {
                            results.push(result);
                        }
                        if (idx >= sqls.length) {
                            conn.commit(function(err) {
                                if (err) {
                                    conn.rollback();
                                    conn.release();
                                    callback(err, results);
                                    return;
                                }
                                conn.release();
                                callback(null, results);
                            });
                            return;
                        }
                        var sql = sqls[idx];
                        var param = params[idx];
                        conn.query(sql, param, function(err, result) {
                            if (err) {
                                next(err);
                                return;
                            }
                            eachCallback({
                                index: idx,
                                sqls: sqls,
                                params: params,
                                result: result
                            }, function(err) {
                                if (err) {
                                    next(err);
                                    return;
                                }
                                next(null, result);
                            });
                        });
                    }

                    next();
                })(-1, []);
            });
        });
    }
};