const { HealthRecord, VitalsHistory, DiseaseAnalytics } = require('../models/sql');

exports.getAllPatientDataSummary = async (req, res) => {
  try {
    const totalRecords = await HealthRecord.count();
    const totalVitals = await VitalsHistory.count();
    const totalAnalytics = await DiseaseAnalytics.count();

    // Get latest records for a quick feed
    const recentRecords = await HealthRecord.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      summary: {
        totalRecords,
        totalVitals,
        totalAnalytics
      },
      recentRecords
    });
  } catch (err) {
    console.error('Admin SQL Summary Error:', err);
    res.status(500).json({ error: 'Server error fetching admin summary' });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const { SqlAppointment } = require('../models/sql');
    const appointments = await SqlAppointment.findAll({
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    res.json(appointments);
  } catch (err) {
    console.error('Admin SQL Appointments Error:', err);
    res.status(500).json({ error: 'Server error fetching appointments' });
  }
};
