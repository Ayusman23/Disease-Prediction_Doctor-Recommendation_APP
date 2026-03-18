const { 
  SqlUser, 
  SqlAppointment, 
  SqlPrescription, 
  SqlTask, 
  SqlInvoice, 
  SqlReminder, 
  SqlPatient,
  SqlDiagnosis,
  SqlDoctorVital,
  SqlDoctorNote
} = require('../models/sql');

// Get all data for doctor dashboard
exports.getDoctorDashboardData = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Doctor email is required' });
    }

    const [appointments, prescriptions, tasks, invoices, reminders, patients, diagnoses, vitals, notes] = await Promise.all([
      SqlAppointment.findAll({ where: { doctorEmail: email } }),
      SqlPrescription.findAll({ where: { doctorEmail: email } }),
      SqlTask.findAll({ where: { doctorEmail: email } }),
      SqlInvoice.findAll({ where: { doctorEmail: email } }),
      SqlReminder.findAll({ where: { doctorEmail: email } }),
      SqlPatient.findAll({ where: { doctorEmail: email } }),
      SqlDiagnosis.findAll({ where: { doctorEmail: email }, order: [['createdAt', 'DESC']] }),
      SqlDoctorVital.findAll({ where: { doctorEmail: email }, order: [['createdAt', 'DESC']] }),
      SqlDoctorNote.findAll({ where: { doctorEmail: email }, order: [['createdAt', 'DESC']] })
    ]);

    res.json({
      appointments,
      prescriptions,
      tasks,
      invoices,
      reminders,
      patients,
      diagnoses,
      vitals,
      notes
    });
  } catch (error) {
    console.error('Error fetching doctor dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update doctor profile
exports.updateDoctorProfile = async (req, res) => {
  try {
    const { uid, name, email, role, photoURL } = req.body;
    const [user, created] = await SqlUser.findOrCreate({
      where: { uid },
      defaults: { name, email, role: 'doctor', photoURL }
    });

    if (!created) {
      await user.update({ name, email, photoURL });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generic creator functions
exports.createAppointment = async (req, res) => {
  try {
    const appointment = await SqlAppointment.create(req.body);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPrescription = async (req, res) => {
  try {
    const prescription = await SqlPrescription.create(req.body);
    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await SqlTask.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await SqlTask.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.update(req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await SqlTask.destroy({ where: { id } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const invoice = await SqlInvoice.create(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createReminder = async (req, res) => {
  try {
    const reminder = await SqlReminder.create(req.body);
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const patient = await SqlPatient.create(req.body);
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDiagnosis = async (req, res) => {
  try {
    const diagnosis = await SqlDiagnosis.create(req.body);
    res.status(201).json(diagnosis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDoctorVital = async (req, res) => {
  try {
    const vital = await SqlDoctorVital.create(req.body);
    res.status(201).json(vital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDoctorNote = async (req, res) => {
  try {
    const note = await SqlDoctorNote.create(req.body);
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appointment = await SqlAppointment.findByPk(id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    await appointment.update({ status });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
