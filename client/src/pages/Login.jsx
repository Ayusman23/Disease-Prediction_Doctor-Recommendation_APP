import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import doctorImage from '../assets/login.jpg';

// --- FIREBASE IMPORTS ---
import { auth, db, googleProvider, facebookProvider } from '../firebase/config';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Logic: 'user' or 'doctor'
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  // Track mouse for the background parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Database Logic: Save/Update user info on login
  const saveUserToFirestore = async (user, selectedRole) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "New User",
        photoURL: user.photoURL || "",
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
        role: selectedRole
      });
    } else {
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
  };

  // Logic: Helper to persist session and redirect based on role
  const finalizeLogin = async (user, selectedRole) => {
    const token = await user.getIdToken();
    const userData = {
      uid: user.uid,
      name: user.displayName || "User",
      email: user.email,
      photoURL: user.photoURL || "",
      role: selectedRole
    };

    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));

    if (selectedRole === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  // --- UPDATED LOGIC TO FETCH NAME ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Fetch existing data from Firestore to get the stored name
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      let actualRole = role;
      let actualName = result.user.displayName || "User";

      if (userSnap.exists()) {
        const data = userSnap.data();
        actualRole = data.role;
        actualName = data.displayName; // This gets the doctor's name from DB
      }

      // Create a user object with the name from the database
      const userWithData = {
        ...result.user,
        displayName: actualName
      };

      await saveUserToFirestore(result.user, actualRole);
      await finalizeLogin(userWithData, actualRole);

    } catch (error) {
      console.error("Login Error:", error.code);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        alert("No account found. Please sign up.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert("Incorrect password.");
      } else {
        alert("Login failed: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user, role);
      await finalizeLogin(result.user, role);
    } catch (error) {
      console.error("Social Auth Error:", error.message);
      alert("Social login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F2F2EB] text-slate-900 font-sans selection:bg-[#FFD966] overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-[#FFD966]/20 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            top: `${mousePosition.y / 25}px`,
            left: `${mousePosition.x / 25}px`,
          }}
        ></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
          <div className="relative bg-white/60 backdrop-blur-xl p-6 rounded-[3rem] shadow-2xl border border-white/50 group hover:shadow-3xl transition-all duration-700">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden">
              <img
                src={doctorImage}
                alt="Healthcare"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=2000"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent flex flex-col justify-end p-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD966] rounded-full mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      {role === 'doctor' ? 'Professional Portal' : 'Patient Access'}
                    </span>
                  </div>
                  <h2 className="text-5xl font-black text-white leading-tight">
                    {role === 'doctor' ? 'Manage Clinic' : 'Check Health'} <br />
                    With AI Insights.
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="space-y-4 text-center lg:text-left">
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 group mb-4 hover:opacity-80 transition-opacity">
              <svg className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-bold text-slate-600">Back to Home</span>
            </button>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">Login</h1>
          </div>

          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl backdrop-blur-sm">
            <button
              onClick={() => setRole('user')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${role === 'user' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Patient Login
            </button>
            <button
              onClick={() => setRole('doctor')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${role === 'doctor' ? 'bg-slate-900 shadow-md text-[#FFD966]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Doctor Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                className="w-full bg-white/80 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:border-[#FFD966] outline-none transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'doctor' ? "doctor@clinic.com" : "patient@email.com"}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-white/80 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:border-[#FFD966] outline-none transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] uppercase tracking-tighter"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex justify-end px-1">
                <button
                  type="button"
                  onClick={() => navigate('/forgot')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl text-lg ${role === 'doctor' ? 'bg-slate-900 text-[#FFD966]' : 'bg-[#FFD966] text-slate-900'}`}
            >
              {isLoading ? "Signing In..." : `Enter Dashboard`}
            </button>
          </form>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleSocialLogin(googleProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">
              Google
            </button>
            <button onClick={() => handleSocialLogin(facebookProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">
              Facebook
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              New to MediPredict?
              <button onClick={() => navigate("/signup")} className="text-slate-900 font-black ml-2 hover:underline decoration-[#FFD966] decoration-4 underline-offset-4">
                Join Now
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.05); } }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Login;

