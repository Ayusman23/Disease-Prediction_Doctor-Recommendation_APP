import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config'; 
import { sendPasswordResetEmail } from 'firebase/auth';

const Forgot = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Firebase Logic: Sends the reset link to the user's email
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Reset Error:", error.code);
      
      // Domain-specific error handling for better user feedback
      if (error.code === 'auth/user-not-found') {
        alert("No account found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Please enter a valid email address.");
      } else if (error.code === 'auth/too-many-requests') {
        alert("Too many requests. Please try again later.");
      } else {
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
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
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Left Side: Visual Section */}
      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
          <div className="relative bg-white/60 backdrop-blur-xl p-6 rounded-[3rem] shadow-2xl border border-white/50 group hover:shadow-3xl transition-all duration-700">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000" 
                alt="Secure Healthcare" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent flex flex-col justify-end p-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD966] rounded-full mb-4">
                    <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">Secure Recovery</span>
                  </div>
                  <h2 className="text-5xl font-black text-white leading-tight">Protected<br/>Account<br/>Access</h2>
                  <p className="text-slate-200 text-lg font-medium opacity-90">Your security is our top priority. We'll help you regain access safely.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form Section */}
      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-md relative z-10">
          
          {isSubmitted ? (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-[#FFD966] to-[#FFD966]/80 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce-slow">
                  <svg className="w-12 h-12 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5" />
                  </svg>
                </div>
                
                <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Check Your Email</h2>
                <p className="text-xl text-slate-600 font-medium mb-8">Instructions sent to:</p>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border-2 border-slate-200 mb-8">
                  <span className="text-lg font-black text-slate-900">{email}</span>
                </div>

                <div className="space-y-4">
                  <button onClick={() => navigate('/login')} className="w-full bg-slate-900 text-[#FFD966] font-black py-6 rounded-2xl hover:bg-slate-800 transition-all text-lg group">
                    <span className="flex items-center justify-center gap-2">Back to Login</span>
                  </button>
                  <button onClick={() => setIsSubmitted(false)} className="w-full text-slate-600 font-bold py-4 hover:text-slate-900 transition-colors">
                    Didn't receive it? Try again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 group mb-2 hover:opacity-80 transition-opacity">
                <svg className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-bold text-slate-600">Back to Login</span>
              </button>

              <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-2">Reset Password</h1>
              <p className="text-xl text-slate-600 font-medium">Enter your email for reset instructions</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      className="w-full bg-white/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl py-6 px-6 pl-14 focus:outline-none focus:border-[#FFD966] focus:ring-4 focus:ring-[#FFD966]/20 transition-all text-slate-900 font-medium placeholder:text-slate-400 text-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-[#FFD966] font-black py-6 rounded-2xl hover:bg-slate-800 transition-all text-lg disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Forgot;