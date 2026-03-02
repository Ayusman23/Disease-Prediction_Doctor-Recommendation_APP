import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, facebookProvider } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Database Logic: Save User Data to Firestore
  const saveUserToFirestore = async (user, customName = null) => {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      fullName: customName || user.displayName || "Anonymous User",
      email: user.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: 'doctor' // Default role
    }, { merge: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^A-Za-z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: formData.fullName });
      await saveUserToFirestore(user, formData.fullName);
      
      setIsRegistered(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      navigate('/login'); // Or straight to dashboard
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-slate-200';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F2F2EB] text-slate-900 font-sans selection:bg-[#FFD966] overflow-hidden">
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-[#FFD966]/20 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            top: `${mousePosition.y / 25}px`,
            left: `${mousePosition.x / 25}px`,
          }}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-slate-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#FFD966]/15 rounded-full blur-3xl"></div>
      </div>

      {/* Left Side: Visual Section */}
      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 w-full max-w-lg space-y-12 animate-fade-in-up">
          <div className="relative bg-white/60 backdrop-blur-xl p-6 rounded-[3rem] shadow-2xl border border-white/50 group hover:shadow-3xl transition-all duration-700">
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/5]">
              <img 
                src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=2000" 
                alt="Healthcare Professional" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
              
              <div className="absolute top-8 left-8 right-8 bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl animate-float">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#FFD966] rounded-2xl flex items-center justify-center text-3xl shadow-lg">🏥</div>
                  <div>
                    <div className="text-xs font-black text-slate-500 uppercase tracking-wider">Join Our Network</div>
                    <div className="text-2xl font-black text-slate-900">5,000+ Doctors</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 left-10 right-10">
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-white leading-tight">Transform<br/>Healthcare<br/>Together</h2>
                  <p className="text-slate-200 text-lg font-medium">Join thousands of medical professionals using AI-powered diagnostics</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '⚡', label: 'Instant Access', value: '24/7' },
              { icon: '🔒', label: 'HIPAA Secure', value: '100%' },
              { icon: '🌍', label: 'Global Reach', value: '85+' }
            ].map((item, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 text-center hover:scale-105 transition-transform duration-300">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-xl font-black text-slate-900">{item.value}</div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Form Section */}
      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-xl relative z-10">
          
          {isRegistered ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-12 shadow-2xl border border-white/50 text-center animate-fade-in">
              <div className="w-24 h-24 bg-[#FFD966] rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-slow shadow-2xl">
                <svg className="w-12 h-12 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Welcome Aboard!</h2>
              <p className="text-xl text-slate-600 font-medium mb-8">Your account has been successfully created</p>
              
              <button onClick={() => navigate('/login')} className="w-full bg-slate-900 text-[#FFD966] font-black py-6 rounded-2xl hover:bg-slate-800 transition-all text-lg shadow-xl group">
                 <span className="flex items-center justify-center gap-2">
                  Continue to Dashboard
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 group mb-2 hover:opacity-80 transition-opacity">
                  <svg className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-sm font-bold text-slate-600">Back to Home</span>
                </button>
                <h1 className="text-6xl font-black tracking-tighter text-slate-900">Join MediPredict</h1>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-3">
                   <input type="text" name="fullName" required className="w-full bg-white/80 border-2 border-slate-200 rounded-2xl py-5 px-6 focus:border-[#FFD966] outline-none transition-all font-medium" placeholder="Full Name" onChange={handleChange} />
                </div>

                {/* Email */}
                <div className="space-y-3">
                  <input type="email" name="email" required className="w-full bg-white/80 border-2 border-slate-200 rounded-2xl py-5 px-6 focus:border-[#FFD966] outline-none transition-all font-medium" placeholder="Email Address" onChange={handleChange} />
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" required className="w-full bg-white/80 border-2 border-slate-200 rounded-2xl py-5 px-6 focus:border-[#FFD966] outline-none transition-all font-medium" placeholder="Password" onChange={handleChange} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {formData.password && (
                    <div className="flex gap-2 px-1">
                      {[1,2,3,4].map((level) => (
                        <div key={level} className={`h-2 flex-1 rounded-full transition-all duration-300 ${passwordStrength >= level ? getPasswordStrengthColor() : 'bg-slate-200'}`}></div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-3">
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required className="w-full bg-white/80 border-2 border-slate-200 rounded-2xl py-5 px-6 focus:border-[#FFD966] outline-none transition-all font-medium" placeholder="Confirm Password" onChange={handleChange} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">{showConfirmPassword ? "Hide" : "Show"}</button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-[#FFD966] font-black py-6 rounded-2xl hover:bg-slate-800 transition-all text-lg shadow-xl disabled:opacity-70">
                  {isLoading ? "Processing..." : "Create Account"}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#F2F2EB] px-4 text-slate-500 font-black tracking-widest">Or sign up with</span></div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleSocialSignup(googleProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-200 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">Google</button>
                <button onClick={() => handleSocialSignup(facebookProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-200 rounded-2xl py-4 hover:border-slate-900 transition-all font-bold text-slate-700">Facebook</button>
              </div>

              <div className="text-center">
                <p className="font-medium text-slate-600">Already have an account? <button onClick={() => navigate('/login')} className="text-slate-900 font-black hover:underline">Sign In</button></p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.05); } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Signup;