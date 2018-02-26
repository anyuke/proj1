module.exports = {
	info: function(req, res) {
		return utils.response(res, {code: 0, message: 'success', data: 'hello world'});
	}
};