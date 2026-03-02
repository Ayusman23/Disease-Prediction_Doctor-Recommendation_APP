import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/signup';
import Forgot from './pages/forgot';
import Pricing from './pages/pricing';

// Import your split dashboards
import UserDashboard from './pages/UserDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DiseasePrediction from './pages/DiseasePrediction';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Landing Page is the first thing users see */}
        <Route path="/" element={<LandingPage />} />

        {/* Navigation routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* --- DUAL DASHBOARD ROUTES --- */}

        {/* Path for Patients/Users */}
        <Route path="/dashboard" element={<UserDashboard />} />

        {/* Disease Prediction Tool */}
        <Route path="/prediction" element={<DiseasePrediction />} />

        {/* Path for Doctors */}
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />

        {/* Redirect any broken links back to the Landing Page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;