var redis = require('redis');
var redisClient = redis.createClient(config.redis.port, config.redis.host, config.redis.opts);

module.exports = {
    client: function() {
        if (redisClient) {
            return redisClient;
        }
        redisClient = redis.createClient(config.redis.port, config.redis.host, config.redis.opts);
        redisClient.on('error', function(err) {
            logger.error(err);
        });
        return redisClient;
    },

    setLock: function(resource, ttl, callback) {
        if (!resource || !ttl || !callback) {
            return callback('缺少参数', null);
        }
        var self = this;
        var value = utils.randomStr(16);
        self.client().SET(resource, value, 'EX', ttl, 'NX', function(err, reply) {
            if (!err && reply === 'OK') {
                return callback(null, {resource: resource, value: value});
            }
            err = err || resource + '处于锁定状态';
            return callback(err, null);
        });
    },

    clearLock: function(lock) {
        if (!lock) {
            return;
        }
        var self = this;
        self.client().GET(lock.resource, function(err, reply) {
            if (reply === lock.value) {
                self.client().DEL(lock.resource);
            }
        });
    },

    setLock2: function(resource, value, ttl, callback) {
        if (!resource || !ttl || !callback) {
            return callback('缺少参数', null);
        }
        var self = this;
        self.client().SET(resource, value, 'EX', ttl, 'NX', function(err, reply) {
            if (!err && reply === 'OK') {
                return callback(null, {resource: resource, value: value});
            }
            err = err || resource + '处于锁定状态';
            return callback(err, null);
        });
    },

    isLock: function(resource, value, callback) {
        var self = this;
        self.client().GET(resource, function(err, reply) {
            return callback(err, value == reply);
        });
    }
};