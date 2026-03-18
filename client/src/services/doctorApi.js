/**
 * Doctor Dashboard API Service
 * Connects frontend DoctorDashboard to the MySQL/PostgreSQL backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API = `${BASE_URL}/api/doctors`;

/**
 * Fetch all data for doctor dashboard (appointments, patients, prescriptions, etc.)
 */
export const fetchDoctorDashboardData = async (email) => {
  try {
    const res = await fetch(`${API}/dashboard?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] fetchDoctorDashboardData error:', err);
    return {
      appointments: [],
      prescriptions: [],
      tasks: [],
      invoices: [],
      reminders: [],
      patients: [],
      diagnoses: [],
      vitals: [],
      notes: []
    };
  }
};

/**
 * Update doctor profile in SQL
 */
export const updateDoctorProfile = async (profileData) => {
  try {
    const res = await fetch(`${API}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] updateDoctorProfile error:', err);
    return null;
  }
};

/**
 * Management CRUD operations
 */
export const createSqlAppointment = async (data) => {
  try {
    const res = await fetch(`${API}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createAppointment error:', err);
    return null;
  }
};

export const updateSqlAppointmentStatus = async (id, status) => {
  try {
    const res = await fetch(`${API}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] updateAppointmentStatus error:', err);
    return null;
  }
};

export const createSqlPrescription = async (data) => {
  try {
    const res = await fetch(`${API}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createPrescription error:', err);
    return null;
  }
};

export const createSqlTask = async (data) => {
  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createTask error:', err);
    return null;
  }
};

export const updateSqlTask = async (id, data) => {
  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] updateTask error:', err);
    return null;
  }
};

export const deleteSqlTask = async (id) => {
  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] deleteTask error:', err);
    return null;
  }
};

export const createSqlInvoice = async (data) => {
  try {
    const res = await fetch(`${API}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createInvoice error:', err);
    return null;
  }
};

export const createSqlReminder = async (data) => {
  try {
    const res = await fetch(`${API}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createReminder error:', err);
    return null;
  }
};

export const createSqlPatient = async (data) => {
  try {
    const res = await fetch(`${API}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createPatient error:', err);
    return null;
  }
};

export const createSqlDiagnosis = async (data) => {
  try {
    const res = await fetch(`${API}/diagnoses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createDiagnosis error:', err);
    return null;
  }
};

export const createSqlDoctorVital = async (data) => {
  try {
    const res = await fetch(`${API}/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createDoctorVital error:', err);
    return null;
  }
};

export const createSqlDoctorNote = async (data) => {
  try {
    const res = await fetch(`${API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('[doctorApi] createDoctorNote error:', err);
    return null;
  }
};
