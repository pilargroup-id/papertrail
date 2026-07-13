const express = require('express');
const router = express.Router();

const CurrencyController = require('../../controllers/master/currency.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_CURRENCY', 'view'),
  CurrencyController.index
);

router.get(
  '/exchange-rates/latest',
  requireModulePermission('MASTER_CURRENCY', 'view'),
  CurrencyController.latestRate
);

router.post(
  '/exchange-rates',
  requireModulePermission('MASTER_CURRENCY', 'create'),
  CurrencyController.createRate
);

router.post(
  '/exchange-rates/sync',
  requireModulePermission('MASTER_CURRENCY', 'create'),
  CurrencyController.syncRates
);

module.exports = router;
