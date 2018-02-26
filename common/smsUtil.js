/**
 * Created by Administrator on 2017/5/10.
 */
var uuid = require('node-uuid');
var request = require('request');
var crypto = require('crypto');
var cryptoJs = require('crypto-js');

module.exports = {
    specialUrlEncode: function(value) {
        return encodeURIComponent(value).replace('+', '%20').replace('*', '%2A').replace('%7E', '~');
    },

    //升序排序
    sort: function(obj) {
        var newobj = {};
        var keys = [];
        var i, j, key;
        for (key in obj) {
            keys.push(key);
        }
        for (i = 0; i < keys.length; i++) {
            for (j = i + 1; j < keys.length; j++) {
                if (keys[i] > keys[j]) {
                    key = keys[i];
                    keys[i] = keys[j];
                    keys[j] = key;
                }
            }
        }
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            newobj[key] = obj[key];
        }
        return newobj;
    },

    sendByAliyun: function(verifyCode, mobileNum, callback) {
        if (!verifyCode || !mobileNum) {
            if (callback) callback('缺少参数');
            return;
        }
        var params = {
            AccessKeyId: '',
            Action: 'SendSms',
            Format: 'JSON',
            PhoneNumbers: mobileNum,
            RegionId: '',
            SignName: '',
            SignatureMethod: 'HMAC-SHA1',
            SignatureNonce: uuid.v4(),
            SignatureVersion: '1.0',
            TemplateCode: '',
            TemplateParam: JSON.stringify({code: verifyCode}),
            Timestamp: utils.dateFormat(new Date(new Date().getTime() - 60 * 60 * 8 * 1000), 'yyyy-MM-ddThh:mm:ssZ'),
            Version: '2017-05-25'
        };
        params = this.sort(params);
        var str = '';
        var get = '';
        for (var key in params) {
            str += '&' + this.specialUrlEncode(key) + '=' + this.specialUrlEncode(params[key]);
            get += '&' + this.specialUrlEncode(key) + '=' + this.specialUrlEncode(params[key]);
        }
        str = str.substring(1);
        str = 'GET&%2F&' + this.specialUrlEncode(str);
        var sign = crypto.createHmac('sha1', '').update(str).digest().toString('base64');
        request.get('http://dysmsapi.aliyuncs.com/?Signature=' + this.specialUrlEncode(sign) + get.replace('GET&%2F', ''), function(err, rsp, body) {
            if (err) {
                logger.error(err);
                if (callback) callback(err);
                return;
            }
            body = JSON.parse(body);
            if (body.Code == 'OK') {
                if (callback) callback(null);
            }
            else {
                if (callback) callback(body.Message);
            }
        });
    },

    sendByYunTongXun: function(verifyCode, mobileNum, callback) {
        if (!verifyCode || !mobileNum) {
            if (callback) callback('缺少参数');
            return;
        }
        var body = {
            to: mobileNum,
            appId: '',
            templateId: '',
            datas: [verifyCode]
        };
        var options = {
            url: 'https://app.cloopen.com:8883/2013-12-26/Accounts//SMS/TemplateSMS?sig=' + cryptoJs.MD5('' + utils.dateFormat(new Date(), 'yyyyMMddhhmmss')).toString().toUpperCase(),
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=utf-8',
                'Content-Length': JSON.stringify(body).length,
                'Authorization': new Buffer(':' + utils.dateFormat(new Date(), 'yyyyMMddhhmmss')).toString('base64')
            },
            body: JSON.stringify(body)
        };
        request(options, function(err, rsp, body) {
            if (err) {
                logger.error(err);
                if (callback) callback(err);
            }
            body = JSON.parse(body);
            if (body.statusCode == 0) {
                if (callback) callback(null);
            }
            else {
                if (callback) callback(body.statusMsg);
            }
        });
    },

    sendByMxtong: function(verifyCode, mobileNum, callback) {
        if (!verifyCode || !mobileNum) {
            if (callback) callback('缺少参数');
            return;
        }
        var url = 'http://www.mxtong.net.cn/GateWay/Services.asmx/DirectSend?UserID=&Account=admin&Password=&Phones=' + mobileNum + '&Content=验证码' + verifyCode + '，10分钟内输入有效，验证码等同于密码，请妥善保管！【' + config.third.serverName + '】&SendTime=&SendType=1&PostFixNumber=';
        request.get(encodeURI(url), callback);
    },

    sendByMxtong2: function(content, mobileNum, callback) {
        if (!verifyCode || !mobileNum) {
            if (callback) callback('缺少参数');
            return;
        }
        var url = 'http://www.mxtong.net.cn/GateWay/Services.asmx/DirectSend?UserID=&Account=admin&Password=&Phones=' + mobileNum + '&Content=' + content + '【' + config.third.serverName + '】&SendTime=&SendType=1&PostFixNumber=';
        request.get(encodeURI(url), callback);
    },

    sendMult: function(content, mobiles, callback) {
        if (!content || mobiles.list == 0) {
            if (callback) callback('缺少参数', null);
            return;
        }
        for (var i = 0; i < mobiles.length; i++) {
            if (!utils.isValidMobileNum(mobiles[i])) {
                if (callback) callback('手机号' + mobiles[i] + '格式不正确', null);
                return;
            }
        }
        mobiles = utils.arrayDistinct(mobiles);
        (function work(list, count, s, f, callback) {
            if (count == list.length) {
                if (callback) {
                    callback(null, {success: s, fail: f});
                }
                return;
            }
            var url = 'http://www.mxtong.net.cn/GateWay/Services.asmx/DirectSend?UserID=&Account=admin&Password=&Phones=' + list[count] + '&Content=' + content + '【' + config.third.serverName + '】&SendTime=&SendType=1&PostFixNumber=';
            request.get(encodeURI(url), function(err) {
                if (err) {
                    f++;
                }
                else {
                    s++;
                }
                count++;
                work(list, count, s, f, callback);
            });
        })(mobiles, 0, 0, 0, callback);
    }
};