/**
 * Patient Dashboard API Service
 * Connects frontend UserDashboard to the MySQL/PostgreSQL backend.
 * All data is saved per-user (identified by their email).
 *
 * In dev: Vite proxy forwards /api/* -> http://localhost:5000
 * In prod: set VITE_API_URL=https://your-backend.com in .env.production
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API = `${BASE_URL}/api/patient`;

/**
 * Fetch all saved dashboard data for a patient (records, vitals history, analytics).
 */
export const fetchDashboardData = async (userEmail) => {
  try {
    const res = await fetch(`${API}/dashboard?userEmail=${encodeURIComponent(userEmail)}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] fetchDashboardData error:', err);
    return { healthRecords: [], healthHistory: [], diseaseAnalytics: [] };
  }
};

/**
 * Save a health record (file upload / manual entry) to the DB.
 */
export const saveHealthRecord = async (userEmail, record) => {
  try {
    const res = await fetch(`${API}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, userEmail })
    });
    if (!res.ok) throw new Error('Failed to save health record');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] saveHealthRecord error:', err);
    return null;
  }
};

/**
 * Save a vitals history snapshot to the DB.
 */
export const saveVitalsHistory = async (userEmail, vitals) => {
  try {
    const res = await fetch(`${API}/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vitals, userEmail })
    });
    if (!res.ok) throw new Error('Failed to save vitals');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] saveVitalsHistory error:', err);
    return null;
  }
};

/**
 * Save disease analytics detected from AI prescription analysis to the DB.
 */
export const saveDiseaseAnalytics = async (userEmail, analyticsArray) => {
  try {
    const res = await fetch(`${API}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, analyticsArray })
    });
    if (!res.ok) throw new Error('Failed to save disease analytics');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] saveDiseaseAnalytics error:', err);
    return null;
  }
};

/**
 * Sync user profile (from Firebase) to MySQL/PostgreSQL.
 */
export const syncUserWithSQL = async (userData) => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error('Failed to sync user to SQL');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] syncUserWithSQL error:', err);
    return null;
  }
};

/**
 * Get all users from SQL (for admin dashboard).
 */
export const fetchSqlUsers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch SQL users');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] fetchSqlUsers error:', err);
    return [];
  }
};

/**
 * Save an appointment to the SQL DB.
 */
export const saveAppointment = async (userEmail, appointment) => {
  try {
    const res = await fetch(`${BASE_URL}/api/doctors/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appointment, patientId: userEmail, doctorEmail: appointment.doctorEmail || 'doctor@hospital.com' })
    });
    if (!res.ok) throw new Error('Failed to save appointment');
    return await res.json();
  } catch (err) {
    console.error('[patientApi] saveAppointment error:', err);
    return null;
  }
};
