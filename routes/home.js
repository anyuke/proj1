const router = require('express').Router();

router.get('/info',
	modules.home.info
);

module.exports = router;