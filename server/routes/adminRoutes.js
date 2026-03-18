const express = require('express');
const router = express.Router();
const adminSqlController = require('../controllers/adminSqlController');

// Admin stats for SQL data
router.get('/summary', adminSqlController.getAllPatientDataSummary);
router.get('/appointments', adminSqlController.getAllAppointments);

module.exports = router;
