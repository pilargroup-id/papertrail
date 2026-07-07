const express = require('express');
const router = express.Router();

const config = require('../../config');
const DirectoryController = require('../../controllers/directory.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.use(requireApp(config.app.slug));

router.get('/directory/departments', (req, res, next) => {
  req.params.resource = 'departments';
  return DirectoryController.listResource(req, res, next);
});

router.get('/directory/companies', (req, res, next) => {
  req.params.resource = 'companies';
  return DirectoryController.listResource(req, res, next);
});

router.get('/directory/users', (req, res, next) => {
  req.params.resource = 'users';
  return DirectoryController.listResource(req, res, next);
});

module.exports = router;
