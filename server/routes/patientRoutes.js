const express = require('express');
const router = express.Router();
const sqlPatientController = require('../controllers/sqlPatientController');

// Patient Dashboard SQL integration
router.get('/dashboard', sqlPatientController.getPatientDashboardData);
router.post('/record', sqlPatientController.addHealthRecord);
router.post('/vitals', sqlPatientController.addVitalsHistory);
router.post('/analytics', sqlPatientController.addDiseaseAnalytics);

module.exports = router;
