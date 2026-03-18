const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sqlDb');

// Used for Health Records and Prescriptions
const HealthRecord = sequelize.define('HealthRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'Prescription Upload'
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'verified'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vitals: {
    type: DataTypes.JSON, // For mysql or postgres JSON fields
    allowNull: true
  },
  aiData: {
    type: DataTypes.JSON, // For AI predicted conditions
    allowNull: true
  }
}, {
  tableName: 'health_records',
  timestamps: true
});

// Used to plot the Vitals History Graph in Dashboard
const VitalsHistory = sequelize.define('VitalsHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  heartRate: DataTypes.INTEGER,
  bloodPressure: DataTypes.STRING,
  temperature: DataTypes.FLOAT,
  weight: DataTypes.FLOAT,
  spo2: DataTypes.INTEGER,
  bloodGlucose: DataTypes.INTEGER
}, {
  tableName: 'vitals_history',
  timestamps: true
});

// Used for Disease Analytics
const DiseaseAnalytics = sequelize.define('DiseaseAnalytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  condition: DataTypes.STRING,
  severity: DataTypes.STRING,
  source: DataTypes.STRING,
  date: DataTypes.STRING,
  medications: {
    type: DataTypes.JSON,
    allowNull: true
  },
  diagnosis: DataTypes.STRING
}, {
  tableName: 'disease_analytics',
  timestamps: true
});

// User model for Patients and Doctors
const SqlUser = sequelize.define('User', {
  uid: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user' // 'user' | 'doctor' | 'admin'
  },
  photoURL: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true
});

// SQL Appointment Model
const SqlAppointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: DataTypes.STRING,
  time: DataTypes.STRING,
  type: DataTypes.STRING,
  reason: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'scheduled'
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'appointments',
  timestamps: true
});

// SQL Prescription Model
const SqlPrescription = sequelize.define('Prescription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  medication: DataTypes.STRING,
  dosage: DataTypes.STRING,
  frequency: DataTypes.STRING,
  duration: DataTypes.STRING,
  instructions: DataTypes.TEXT,
  date: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active'
  }
}, {
  tableName: 'prescriptions',
  timestamps: true
});

// SQL Task Model
const SqlTask = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: DataTypes.STRING,
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'Medium'
  },
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  due: DataTypes.STRING,
}, {
  tableName: 'tasks',
  timestamps: true
});

// SQL Invoice Model
const SqlInvoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  services: {
    type: DataTypes.JSON,
    allowNull: true
  },
  total: DataTypes.FLOAT,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Unpaid'
  },
  dueDate: DataTypes.STRING
}, {
  tableName: 'invoices',
  timestamps: true
});

// SQL Reminder Model
const SqlReminder = sequelize.define('Reminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  patientId: DataTypes.STRING,
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  dueDate: DataTypes.STRING,
  dueTime: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
}, {
  tableName: 'reminders',
  timestamps: true
});

// SQL Patient Model (for doctors to manage)
const SqlPatient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctorEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: DataTypes.STRING,
  age: DataTypes.STRING,
  gender: DataTypes.STRING,
  contact: DataTypes.STRING,
  phone: DataTypes.STRING,
  condition: DataTypes.STRING,
  notes: DataTypes.TEXT,
  bloodGroup: DataTypes.STRING,
  allergies: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Stable'
  },
  lastVisit: DataTypes.STRING
}, {
  tableName: 'patients',
  timestamps: true
});

// SQL Diagnosis Model
const SqlDiagnosis = sequelize.define('Diagnosis', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctorEmail: { type: DataTypes.STRING, allowNull: false },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  diagnosis: DataTypes.STRING,
  severity: { type: DataTypes.STRING, defaultValue: 'Mild' },
  symptoms: DataTypes.STRING,
  tests: DataTypes.STRING,
  notes: DataTypes.TEXT,
  followUp: DataTypes.STRING,
  date: DataTypes.STRING
}, { tableName: 'doctor_diagnoses', timestamps: true });

// SQL Doctor Vitals Model
const SqlDoctorVital = sequelize.define('DoctorVital', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctorEmail: { type: DataTypes.STRING, allowNull: false },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  bp_sys: DataTypes.INTEGER,
  bp_dia: DataTypes.INTEGER,
  heartRate: DataTypes.INTEGER,
  temp: DataTypes.FLOAT,
  weight: DataTypes.FLOAT,
  height: DataTypes.FLOAT,
  oxygen: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  date: DataTypes.STRING
}, { tableName: 'doctor_vitals', timestamps: true });

// SQL Doctor Note Model
const SqlDoctorNote = sequelize.define('DoctorNote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctorEmail: { type: DataTypes.STRING, allowNull: false },
  patientId: DataTypes.STRING,
  patientName: DataTypes.STRING,
  title: DataTypes.STRING,
  category: { type: DataTypes.STRING, defaultValue: 'General' },
  content: DataTypes.TEXT,
  private: { type: DataTypes.BOOLEAN, defaultValue: false },
  date: DataTypes.STRING
}, { tableName: 'doctor_notes', timestamps: true });

module.exports = {
  HealthRecord,
  VitalsHistory,
  DiseaseAnalytics,
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
};

