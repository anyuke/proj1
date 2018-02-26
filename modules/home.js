module.exports = {
	info: function(req, res) {
		mysqlUtil.execute('select * from demo', [], function(err, result) {
			if (err) {
				logger.error(err);
				return utils.response(res, message.SYSTEM_ERROR);
			}
			if (result.length == 0) {
				return utils.response(res, {code: 0, message: 'success', data: ''});
			}
			return utils.response(res, {code: 0, message: 'success', data: result[0]});
		});
	}
};