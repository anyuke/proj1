module.exports = {
    SUCCESS: {code: 0, message: 'SUCCESS'},
    NO_DATA: {code: -1, message: '无数据'},
    SYSTEM_ERROR: {code: -1, message: '系统故障，请稍后重试'},
    ALREADY_EXIST: {code: -1, message: '已存在'},
    PARAMS_MISSING: {code: -1, message: '参数不全'},
    OPERATE_NOT_ALLOW: {code: -1, message: '操作不允许'},
    NOT_FOUND: {code: -1, message: '未找到'},
    INVALID_TOKEN: {code: -1, message: '登录过期，请重新登录'},
    INVALID_SIGN: {code: -1, message: '签名无效'},
    INVALID_MOBILE: {code: -1, message: '手机号无效'},
    INVALID_IDENTITY: {code: -1, message: '身份证无效'},
    USER_NOT_FOUND: {code: 1001, message: '身份证无效'},
    NEED_LOGIN: {code: 9999, message: '请先登录'}
};