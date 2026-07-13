const express = require('express');
const rpController = require('../../controllers/rp/rp.controller');

const router = express.Router();

router.get('/', rpController.list);
router.get('/:id', rpController.detail);

router.post('/', rpController.create);
router.put('/:id', rpController.update);

router.post('/:id/requester-manager-approve', rpController.requesterManagerApprove);
router.post('/:id/requester-manager-reject', rpController.requesterManagerReject);

router.post('/:id/destination-check', rpController.destinationCheck);
router.post('/:id/destination-check-reject', rpController.destinationCheckerReject);

router.post('/:id/destination-manager-approve', rpController.destinationManagerApprove);
router.post('/:id/destination-manager-reject', rpController.destinationManagerReject);

router.post('/:id/revert', rpController.revert);

router.post('/:id/create-frp', rpController.createFrp);
router.post('/:id/procurement-void', rpController.procurementVoid);

module.exports = router;
