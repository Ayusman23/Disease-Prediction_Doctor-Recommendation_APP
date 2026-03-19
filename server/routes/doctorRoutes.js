const express = require('express');
const router = express.Router();
const sqlDoctorController = require('../controllers/sqlDoctorController');

// Doctor Dashboard SQL integration
router.get('/dashboard', sqlDoctorController.getDoctorDashboardData);
router.post('/profile', sqlDoctorController.updateDoctorProfile);

// Management routes
router.post('/appointments', sqlDoctorController.createAppointment);
router.patch('/appointments/:id/status', sqlDoctorController.updateAppointmentStatus);

router.post('/prescriptions', sqlDoctorController.createPrescription);

router.post('/tasks', sqlDoctorController.createTask);
router.patch('/tasks/:id', sqlDoctorController.updateTask);
router.delete('/tasks/:id', sqlDoctorController.deleteTask);

router.post('/invoices', sqlDoctorController.createInvoice);
router.post('/reminders', sqlDoctorController.createReminder);

router.post('/patients', sqlDoctorController.createPatient);

router.post('/diagnoses', sqlDoctorController.createDiagnosis);
router.post('/vitals', sqlDoctorController.createDoctorVital);
router.post('/notes', sqlDoctorController.createDoctorNote);

module.exports = router;
