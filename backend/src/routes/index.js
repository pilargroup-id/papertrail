const express = require('express');
const router  = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/internal', require('./internal'));
router.use('/master', require('./master'));
router.use('/frp', require('./frp'));
router.use('/rp', require('./rp'));
router.use('/logs', require('./logs'));

module.exports = router;
