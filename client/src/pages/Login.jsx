import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import doctorImage from '../assets/login.jpg';

// --- FIREBASE IMPORTS ---
import { auth, db, googleProvider, facebookProvider } from '../firebase/config';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { syncUserWithSQL } from '../services/patientApi';

const ADMIN_EMAIL = 'ayusmansamantaray08@gmail.com';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user' | 'doctor' | 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const saveUserToFirestore = async (user, selectedRole) => {
    try {
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
        return { role: selectedRole, name: user.displayName || "New User" };
      } else {
        const existingData = userSnap.data();
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        return { role: existingData.role, name: existingData.displayName };
      }
    } catch (err) {
      console.error("Firestore Sync Error:", err);
      return { role: selectedRole, name: user.displayName || "User" };
    }
  };

  const finalizeLogin = async (user, finalRole, finalName) => {
    const token = await user.getIdToken();
    const isAdmin = user.email === ADMIN_EMAIL || finalRole === 'admin';
    const userData = {
      uid: user.uid,
      name: finalName,
      email: user.email,
      photoURL: user.photoURL || "",
      role: isAdmin ? 'admin' : finalRole
    };

    // ─── Sync user with SQL DB ───
    await syncUserWithSQL(userData);

    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));

    if (isAdmin) {
      navigate('/admin-dashboard');
    } else {
      navigate(finalRole === 'doctor' ? '/doctor-dashboard' : '/dashboard');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Admin-specific validation
    if (role === 'admin' && email !== ADMIN_EMAIL) {
      setError('Access denied. This email is not authorized as admin.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const { role: finalRole, name: finalName } = await saveUserToFirestore(result.user, role);
      await finalizeLogin(result.user, finalRole, finalName);
    } catch (error) {
      setError(error.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (role === 'admin') {
      setError('Admin login must use email and password only.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const { role: finalRole, name: finalName } = await saveUserToFirestore(result.user, role);
      await finalizeLogin(result.user, finalRole, finalName);
    } catch (error) {
      console.error("Social Auth Error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setError("This login provider is not enabled. Please contact the admin.");
      } else {
        setError("Social login failed: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfig = {
    user: {
      label: 'Patient Login',
      color: '#FFD966',
      textColor: '#1a1a1a',
      bgActive: 'bg-white',
      placeholder: 'patient@email.com',
      heroTitle: 'Check Health\nWith AI Insights.',
      badge: 'Patient Access',
      btnClass: 'bg-[#FFD966] text-slate-900',
    },
    doctor: {
      label: 'Doctor Login',
      color: '#1a1a2e',
      textColor: '#FFD966',
      bgActive: 'bg-slate-900',
      placeholder: 'doctor@clinic.com',
      heroTitle: 'Manage Clinic\nWith AI Insights.',
      badge: 'Professional Portal',
      btnClass: 'bg-slate-900 text-[#FFD966]',
    },
    admin: {
      label: 'Admin Login',
      color: '#6366f1',
      textColor: '#fff',
      bgActive: 'bg-indigo-600',
      placeholder: 'admin@medipredict.com',
      heroTitle: 'Control Platform\nWith Full Access.',
      badge: '🔐 Admin Access',
      btnClass: 'bg-indigo-600 text-white',
    },
  };

  const cfg = roleConfig[role];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F2F2EB] text-slate-900 font-sans selection:bg-[#FFD966] overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            background: role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,217,102,0.2)',
            top: `${mousePosition.y / 25}px`,
            left: `${mousePosition.x / 25}px`
          }}
        />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Hero Side */}
      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')" }} />
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
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 transition-colors duration-300"
                    style={{ background: role === 'admin' ? '#6366f1' : '#FFD966' }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: role === 'admin' ? '#fff' : '#1a1a1a' }}>
                      {cfg.badge}
                    </span>
                  </div>
                  <h2 className="text-5xl font-black text-white leading-tight whitespace-pre-line">
                    {cfg.heroTitle}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Admin badge on hero */}
          {role === 'admin' && (
            <div className="mt-4 flex items-center gap-3 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl">🛡️</div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Restricted Access</div>
                <div className="text-slate-500 text-xs">Only authorized administrators can log in here.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-md space-y-7 relative z-10">
          {/* Back button */}
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <svg className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-bold text-slate-600">Back to Home</span>
          </button>

          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">Login</h1>
            <p className="text-slate-500 text-sm">Select your role and sign in to continue.</p>
          </div>

          {/* Role Selector - 3 tabs */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl backdrop-blur-sm gap-1">
            {[
              { id: 'user', label: 'Patient' },
              { id: 'doctor', label: 'Doctor' },
              { id: 'admin', label: '🔐 Admin' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => { setRole(r.id); setError(''); }}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${role === r.id
                    ? r.id === 'admin'
                      ? 'bg-indigo-600 shadow-md text-white'
                      : r.id === 'doctor'
                        ? 'bg-slate-900 shadow-md text-[#FFD966]'
                        : 'bg-white shadow-md text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Admin info box */}
          {role === 'admin' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-3">
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <div>
                <div className="font-bold text-indigo-900 text-sm mb-1">Administrator Access</div>
                <div className="text-indigo-700 text-xs leading-relaxed">
                  Full platform control. Use the registered admin email and password to log in.
                  Grants access to user management, analytics, and system settings.
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                className="w-full bg-white/80 border-2 border-slate-100 rounded-2xl py-4 px-6 outline-none transition-all font-medium"
                style={{ '--focus-border': role === 'admin' ? '#6366f1' : '#FFD966' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={cfg.placeholder}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-white/80 border-2 border-slate-100 rounded-2xl py-4 px-6 outline-none transition-all font-medium"
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
                <button type="button" onClick={() => navigate('/forgot')} className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest">
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl text-lg ${cfg.btnClass}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </span>
              ) : (
                role === 'admin' ? '🛡️ Enter Admin Panel' : 'Enter Dashboard'
              )}
            </button>
          </form>

          {/* Social login (only for patient/doctor) */}
          {role !== 'admin' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">or continue with</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => handleSocialLogin(googleProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.3 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.7 7.1 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                    <path fill="#FF3D00" d="M6.3 15.2l6.6 4.8C14.5 17 19 14 24 14c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.7 7.1 29.1 5 24 5c-7.7 0-14.4 4.4-17.7 10.2z" />
                    <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5l-6-5.2C29.4 36.3 26.8 37 24 37c-5.2 0-9.6-2.7-11.3-6.8l-6.5 5C9.5 40.5 16.3 45 24 45z" />
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6 5.2C43 34.6 44 30 44 25c0-1.3-.1-2.6-.4-3.9z" />
                  </svg>
                  Google
                </button>
                <button type="button" onClick={() => handleSocialLogin(facebookProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="#1877F2">
                    <path d="M16 2C8.3 2 2 8.3 2 16c0 7 5.1 12.8 11.8 13.8V20.2h-3.5V16h3.5v-3c0-3.5 2.1-5.4 5.2-5.4 1.5 0 3.1.3 3.1.3v3.4h-1.7c-1.7 0-2.2 1.1-2.2 2.2V16h3.8l-.6 4.2h-3.2v9.6C24.9 28.8 30 23 30 16c0-7.7-6.3-14-14-14z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              New to MediPredict?{' '}
              <button onClick={() => navigate("/signup")} className="text-slate-900 font-black ml-1 hover:underline decoration-[#FFD966] decoration-4 underline-offset-4">
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
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>
    </div>
  );
};

export default Login;