const express = require('express');
const router = express.Router();

const config = require('../../config');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.use(requireApp(config.app.slug));

router.use('/vendors', require('./vendor.routes'));
router.use('/banks', require('./bank.routes'));
router.use('/vendor-bank-accounts', require('./vendorBankAccount.routes'));
router.use('/budgets', require('./budget.routes'));
router.use('/budget-types', require('./budgetType.routes'));
router.use('/budget-access-rules', require('./budgetAccessRule.routes'));
router.use('/rp-destination-departments', require('./rpDestinationDepartment.routes'));
router.use('/frp-document-types', require('./frpDocumentType.routes'));
router.use('/external-document-types', require('./externalDocumentType.routes'));
router.use('/payment-methods', require('./paymentMethod.routes'));
router.use('/rp-payment-categories', require('./rpPaymentCategory.routes'));
router.use('/currencies', require('./currency.routes'));

router.use('/permission-modules', require('./permissionModule.routes'));
router.use('/user-module-permissions', require('./userModulePermission.routes'));

router.use('/rp-checker-rules', require('./rpCheckerRule.routes'));

module.exports = router;