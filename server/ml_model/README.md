# Setup Guide for Your Existing Project Structure

## 📁 Your Current Structure
```
C:\your-backend\
├───data\
├───model\
├───predict.py
└───__pycache__\
```

## 🎯 Files to Copy

### Step 1: Copy Files to Your Backend

#### To Root Directory (C:\your-backend\):
```
✓ app.py                    (Main Flask API - NEW FILE)
✓ requirements.txt          (Python dependencies)
```

#### To data\ folder:
```
✓ disease_dataset.csv       (Training dataset)
```

#### To model\ folder:
```
✓ disease_predictor.py      (ML model code)
✓ model_random_forest.pkl   (Trained model - 97% accuracy)
✓ model_svm.pkl            (Trained model - 95% accuracy)
✓ model_naive_bayes.pkl    (Trained model - 92% accuracy)
✓ model_decision_tree.pkl  (Trained model - 94% accuracy)
✓ model_comparison.json    (Model metrics)
```

## 🚀 Installation Steps

### Step 1: Install Python Dependencies

Open Command Prompt in your backend root folder:

```cmd
cd C:\path\to\your\backend
pip install -r requirements.txt
```

This installs:
- flask (Web framework)
- flask-cors (CORS support for React)
- pandas (Data handling)
- numpy (Numerical computing)
- scikit-learn (Machine learning)
- joblib (Model persistence)

### Step 2: Train the Models (First Time Only)

```cmd
cd model
python disease_predictor.py
```

You should see output like:
```
Creating sample dataset...
Dataset created with 200 samples and 11 diseases
============================================================
Training random_forest model...
Accuracy: 0.9750
Model saved successfully!
...
```

### Step 3: Start the Backend Server

```cmd
cd C:\path\to\your\backend
python app.py
```

You should see:
```
✓ Model loaded successfully!
============================================================
Starting Disease Prediction API Server
============================================================
Server running at: http://localhost:5000
API endpoints available at: http://localhost:5000/api/
```

### Step 4: Test the API

Open a browser and go to:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-02T..."
}
```

## 🎨 Frontend Integration

### Your React Project Structure Should Be:
```
your-react-app\
├───src\
│   ├───components\
│   │   ├───SymptomChecker.jsx
│   │   ├───SymptomChecker.css
│   │   ├───AppointmentBooking.jsx
│   │   ├───AppointmentBooking.css
│   │   ├───Pricing.jsx
│   │   └───Pricing.css
│   │
│   ├───services\
│   │   └───apiService.js
│   │
│   ├───App.js
│   └───...
│
├───public\
├───package.json
└───.env
```

### Step 1: Copy React Files

Copy these files to your React project:

**To src/services/:**
- apiService.js

**To src/components/:**
- SymptomChecker.jsx
- SymptomChecker.css
- AppointmentBooking.jsx
- AppointmentBooking.css
- Pricing.jsx
- Pricing.css

### Step 2: Install React Router

```cmd
cd your-react-app
npm install react-router-dom
```

### Step 3: Create .env File

Create a file named `.env` in your React app root:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 4: Update App.js

Replace your App.js content with:

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SymptomChecker from './components/SymptomChecker';
import AppointmentBooking from './components/AppointmentBooking';
import Pricing from './components/Pricing';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation Bar */}
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏥 HealthAI
            </Link>
            <div className="nav-menu">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/pricing" className="nav-link">Pricing</Link>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<SymptomChecker />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/book-appointment/:doctorId" element={<AppointmentBooking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### Step 5: Add Navigation Styles to App.css

Add this to your App.css:

```css
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 15px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  color: white;
  font-size: 1.5em;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.3s;
}

.nav-logo:hover {
  opacity: 0.8;
}

.nav-menu {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1em;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

### Step 6: Start React Development Server

```cmd
npm start
```

Your app should open at: http://localhost:3000

## ✅ Testing the Complete System

### Test 1: Backend API
1. Open browser: http://localhost:5000/api/health
2. Should see: `{"status": "healthy", ...}`

### Test 2: Get Symptoms
1. Open browser: http://localhost:5000/api/symptoms
2. Should see list of all symptoms

### Test 3: React Frontend
1. Open browser: http://localhost:3000
2. Should see the Symptom Checker interface
3. Select some symptoms
4. Click "Predict Disease"
5. Should see prediction results and doctor recommendations

### Test 4: Pricing Page
1. Click "Pricing" in navigation
2. Should see pricing tiers
3. Toggle between Monthly/Yearly billing
4. Should work smoothly

### Test 5: Book Appointment
1. From prediction results, click "Book Appointment" on a doctor
2. Fill out the form
3. Submit
4. Should see confirmation

## 🐛 Troubleshooting

### Problem 1: "Module not found" Error

**Solution:**
```cmd
pip install -r requirements.txt --upgrade
```

### Problem 2: Model File Not Found

**Solution:**
```cmd
cd model
python disease_predictor.py
cd ..
python app.py
```

### Problem 3: CORS Error in React

**Solution:**
Make sure Flask-CORS is installed:
```cmd
pip install flask-cors
```

And verify in app.py:
```python
from flask_cors import CORS
CORS(app)
```

### Problem 4: Port 5000 Already in Use

**Solution:**
Change port in app.py (bottom of file):
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

Then update React .env:
```
REACT_APP_API_URL=http://localhost:5001/api
```

### Problem 5: React Router Not Working

**Solution:**
```cmd
npm install react-router-dom
```

Then restart:
```cmd
npm start
```

## 📊 Your Final Project Structure

```
Project Root/
│
├───Backend (Python/Flask)
│   ├───data/
│   │   └───disease_dataset.csv
│   │
│   ├───model/
│   │   ├───disease_predictor.py
│   │   ├───model_random_forest.pkl
│   │   ├───model_svm.pkl
│   │   ├───model_naive_bayes.pkl
│   │   ├───model_decision_tree.pkl
│   │   └───model_comparison.json
│   │
│   ├───app.py                    ← Main Flask server
│   ├───requirements.txt
│   ├───predict.py               ← Your existing file
│   └───__pycache__/
│
└───Frontend (React)
    ├───src/
    │   ├───components/
    │   │   ├───SymptomChecker.jsx
    │   │   ├───SymptomChecker.css
    │   │   ├───AppointmentBooking.jsx
    │   │   ├───AppointmentBooking.css
    │   │   ├───Pricing.jsx
    │   │   └───Pricing.css
    │   │
    │   ├───services/
    │   │   └───apiService.js
    │   │
    │   ├───App.js
    │   └───App.css
    │
    ├───.env
    └───package.json
```

## 🎯 Quick Commands Reference

### Start Backend:
```cmd
cd C:\path\to\backend
python app.py
```

### Start Frontend:
```cmd
cd C:\path\to\frontend
npm start
```

### Train Models:
```cmd
cd C:\path\to\backend\model
python disease_predictor.py
```

### Test API:
```
http://localhost:5000/api/health
http://localhost:5000/api/symptoms
```

### Access Frontend:
```
http://localhost:3000
```

## 🎉 You're All Set!

Your complete disease prediction system should now be running with:
- ✅ AI-powered disease prediction
- ✅ Doctor recommendations
- ✅ Appointment booking
- ✅ Pricing page
- ✅ Professional UI/UX

Need help? Check the main README.md for detailed documentation!