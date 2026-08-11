const express = require('express');
const router = express.Router();

const CurrencySyncController = require('../../controllers/internal/currencySync.controller');

router.post('/exchange-rates/sync', CurrencySyncController.syncExchangeRates);
router.get('/exchange-rates/sync', CurrencySyncController.syncExchangeRates);

module.exports = router;
