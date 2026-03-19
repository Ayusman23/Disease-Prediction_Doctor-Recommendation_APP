const { HealthRecord, VitalsHistory, DiseaseAnalytics, SqlAppointment, SqlPrescription } = require('../models/sql');

exports.getPatientDashboardData = async (req, res) => {
  try {
    const { userEmail } = req.query;
    if (!userEmail) return res.status(400).json({ error: 'User email is required' });

    const [records, vitals, analytics, appointments, prescriptions] = await Promise.all([
      HealthRecord.findAll({ where: { userEmail }, order: [['createdAt', 'DESC']] }),
      VitalsHistory.findAll({ where: { userEmail }, order: [['timestamp', 'ASC']] }),
      DiseaseAnalytics.findAll({ where: { userEmail }, order: [['createdAt', 'DESC']] }),
      SqlAppointment.findAll({ where: { patientId: userEmail }, order: [['date', 'DESC']] }),
      SqlPrescription.findAll({ where: { patientId: userEmail }, order: [['createdAt', 'DESC']] })
    ]);

    res.json({ 
      healthRecords: records, 
      healthHistory: vitals, 
      diseaseAnalytics: analytics,
      appointments,
      prescriptions
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Server error fetching dashboard data' });
  }
};


exports.addHealthRecord = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'User email is required' });

    const newRecord = await HealthRecord.create(req.body);
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error adding health record:', err);
    res.status(500).json({ error: 'Server error saving health record' });
  }
};

exports.addVitalsHistory = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'User email is required' });

    const newVitals = await VitalsHistory.create(req.body);
    res.status(201).json(newVitals);
  } catch (err) {
    console.error('Error saving vitals history:', err);
    res.status(500).json({ error: 'Server error saving vitals' });
  }
};

exports.addDiseaseAnalytics = async (req, res) => {
  try {
    const { userEmail, analyticsArray } = req.body;
    if (!userEmail || !analyticsArray || !Array.isArray(analyticsArray)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Insert all items
    const inserted = await Promise.all(
      analyticsArray.map(item => DiseaseAnalytics.create({ ...item, userEmail }))
    );

    res.status(201).json(inserted);
  } catch (err) {
    console.error('Error saving disease analytics:', err);
    res.status(500).json({ error: 'Server error saving analytics' });
  }
};
