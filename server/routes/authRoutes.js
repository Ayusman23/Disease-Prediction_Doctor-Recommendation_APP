const express = require('express');
const router = express.Router();
const sqlAuthController = require('../controllers/sqlAuthController');

// Sync Firebase user to SQL
router.post('/sync', sqlAuthController.syncUser);

// Get all users from SQL for Admin
router.get('/users', sqlAuthController.getAllUsers);
router.delete('/users/:uid', sqlAuthController.deleteUser);

module.exports = router;



