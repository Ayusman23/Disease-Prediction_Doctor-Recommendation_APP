import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F2EB] text-slate-800 font-sans overflow-x-hidden selection:bg-[#FFD966] selection:text-slate-900">

      {/* Advanced Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 bg-[#FFD966]/20 rounded-full blur-3xl transition-transform duration-1000 ease-out"
          style={{
            top: `${mousePosition.y / 20}px`,
            left: `${mousePosition.x / 20}px`,
          }}
        ></div>
        <div className="absolute top-1/4 right-1/4 w-150 h-150 bg-slate-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-[#FFD966]/15 rounded-full blur-3xl"></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      </div>

      {/* Premium Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'bg-white/80 backdrop-blur-2xl shadow-lg shadow-slate-200/50 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/30 group-hover:shadow-2xl group-hover:shadow-slate-900/40 transition-all duration-500 group-hover:scale-110">
              <span className="font-black text-[#FFD966] text-2xl">M</span>
              <div className="absolute inset-0 bg-[#FFD966]/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-slate-900">MediPredict</span>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">AI Healthcare</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-12">
            {/* Added Pricing to this map and ensured they use href anchors */}
            {['Features', 'Technology', 'Testimonials', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-900 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}

            <div className="h-6 w-px bg-linear-to-b from-transparent via-slate-300 to-transparent"></div>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-all duration-300"
            >
              Login
            </button>

            <button
              onClick={() => navigate('/login')}
              className="relative overflow-hidden bg-slate-900 text-[#FFD966] px-8 py-3 rounded-full font-bold text-sm shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all duration-500 hover:scale-105 group">
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 lg:pt-56 pb-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            <div className="space-y-10 relative z-10">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/60 backdrop-blur-xl border border-slate-200 rounded-full shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD966] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD966]"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">Trusted by 50,000+ Healthcare Professionals</span>
              </div>

              <div className="space-y-6">
                <h1 className="text-7xl lg:text-8xl xl:text-9xl font-black leading-[0.9] tracking-tighter text-slate-900">
                  Predict
                  <br />
                  <span className="text-slate-900">
                    Your Health
                  </span>
                  <br />
                  <span className="text-slate-400/60 italic font-serif font-light text-6xl lg:text-7xl">
                    with AI Precision
                  </span>
                </h1>
              </div>

              <p className="text-xl text-slate-600 max-w-xl leading-relaxed font-medium">
                Advanced machine learning algorithms analyze your symptoms in real-time, providing instant insights and connecting you with specialized medical professionals globally.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 pt-8">
                <button
                  onClick={() => navigate('/login')}
                  className="group relative overflow-hidden bg-[#FFD966] text-slate-900 px-12 py-6 rounded-2xl font-black text-lg shadow-2xl shadow-[#FFD966]/40 hover:shadow-3xl hover:shadow-[#FFD966]/50 transition-all duration-500 hover:-translate-y-1">
                  <span className="relative z-10 flex items-center gap-3">
                    Start Free Analysis
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-[#FFD966]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>

                <button className="group flex items-center gap-4 bg-white/80 backdrop-blur-xl px-10 py-6 rounded-2xl font-bold text-lg hover:bg-white transition-all duration-300 border border-slate-200 shadow-lg hover:shadow-xl">
                  <div className="relative w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#FFD966] transition-all duration-300">
                    <svg className="w-5 h-5 fill-slate-600 group-hover:fill-slate-900 transition-colors" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-slate-700 group-hover:text-slate-900">Watch Demo</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-8 pt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-11 h-11 rounded-full border-3 border-white bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-4 h-4 fill-[#FFD966]" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-slate-600">4.9/5 from 1000+ reviews</p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative group">
              <div className="absolute inset-0 bg-[#FFD966] rounded-[4rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>

              <div className="relative z-10 bg-white/60 backdrop-blur-xl p-6 rounded-[4rem] shadow-2xl border border-white/50 transition-all duration-700 group-hover:scale-[1.02]">
                <div className="relative rounded-[3.5rem] overflow-hidden aspect-4/5">
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2000"
                    alt="Medical Technology"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-slate-900/20 to-transparent"></div>

                  <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl animate-float border border-white/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#FFD966] rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-xs font-black text-slate-500 uppercase tracking-wider">Real-time Analysis</div>
                    </div>
                    <div className="text-3xl font-black text-slate-900">98.7%</div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Diagnostic Accuracy</div>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-black text-slate-700">Active Consultations</div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD966] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD966]"></span>
                        </span>
                        <span className="text-xs font-bold text-slate-600">Live</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[85, 92, 78, 95, 88].map((height, i) => (
                        <div key={i} className="flex-1 bg-linear-to-t from-slate-700 to-slate-900 rounded-lg opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${height}%` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Banner */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-12 shadow-2xl border border-white/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {[
                { label: "Medical Specialists", val: "5,000+", icon: "👨‍⚕️" },
                { label: "Diagnoses Completed", val: "250K+", icon: "🔬" },
                { label: "Partner Hospitals", val: "1,200+", icon: "🏥" },
                { label: "Countries Served", val: "85+", icon: "🌍" }
              ].map((stat, i) => (
                <div key={i} className="text-center group cursor-pointer">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                  <div className="text-5xl font-black text-slate-900 mb-2">{stat.val}</div>
                  <div className="text-sm font-bold text-slate-600 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-block px-6 py-2 bg-[#FFD966] rounded-full text-slate-900 font-black uppercase tracking-wider text-sm mb-6">
              Platform Features
            </div>
            <h2 className="text-6xl lg:text-7xl font-black mb-6 text-slate-900">
              Everything You Need
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
              Comprehensive healthcare solutions powered by cutting-edge artificial intelligence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "🧠", title: "AI Symptom Analysis", desc: "Advanced neural networks analyze symptoms with medical-grade precision" },
              { icon: "⚡", title: "Instant Matching", desc: "Connect with the right specialist in under 60 seconds globally" },
              { icon: "🔒", title: "Secure & Private", desc: "Bank-level encryption ensures your health data stays confidential" },
              { icon: "📊", title: "Health Dashboard", desc: "Track your medical history and trends with intuitive visualizations" },
              { icon: "🌐", title: "24/7 Availability", desc: "Access healthcare professionals any time, anywhere in the world" },
              { icon: "💊", title: "Smart Prescriptions", desc: "Digital prescriptions with automated pharmacy coordination" }
            ].map((feature, i) => (
              <div key={i} className="group relative">
                <div className="absolute inset-0 bg-[#FFD966] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                <div className="relative bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="w-16 h-16 bg-[#FFD966] rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Technology Section */}
      <section id="technology" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-block px-6 py-2 bg-slate-900 text-[#FFD966] rounded-full font-black uppercase tracking-wider text-sm">
                Our Stack
              </div>
              <h2 className="text-6xl font-black text-slate-900 leading-tight">Built with the world's most <span className="text-slate-400">advanced AI.</span></h2>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">Our proprietary architecture combines transformer models with clinical knowledge graphs to ensure 99% accuracy in preliminary assessments.</p>

              <div className="space-y-4">
                {['Transformer-based symptom mapping', 'Federated learning for data privacy', 'GPU-accelerated real-time inference'].map((tech, i) => (
                  <div key={i} className="flex items-center gap-4 text-slate-800 font-bold">
                    <div className="w-6 h-6 rounded-full bg-[#FFD966] flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                    </div>
                    {tech}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD966]/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 space-y-8">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                  <div className="text-[#FFD966] font-black text-xs uppercase tracking-widest mb-2">Model Performance</div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FFD966] w-[94%]"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-white font-bold text-sm">
                    <span>Accuracy</span>
                    <span>94.2%</span>
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                  <div className="text-[#FFD966] font-black text-xs uppercase tracking-widest mb-2">Latency</div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 w-[15%]"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-white font-bold text-sm">
                    <span>Response Time</span>
                    <span>140ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Testimonials Section */}
      <section id="testimonials" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white/40 backdrop-blur-2xl rounded-[4rem] p-16 border border-white/50 shadow-2xl">
            <h2 className="text-5xl font-black text-center text-slate-900 mb-16 italic">"A paradigm shift in <span className="text-slate-400">patient-first</span> technology."</h2>
            <div className="grid md:grid-cols-2 gap-12">
              {[
                { name: "Dr. Elena Rodriguez", role: "Chief of Medicine", text: "MediPredict has reduced our triage wait times by 40%. The AI's ability to categorize symptoms accurately is unparalleled." },
                { name: "Marcus Thorne", role: "HealthTech Analyst", text: "The cleanest implementation of healthcare AI I've seen. It bridges the gap between raw data and human empathy." }
              ].map((test, i) => (
                <div key={i} className="space-y-6">
                  <p className="text-xl text-slate-600 font-medium leading-relaxed">"{test.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-black text-[#FFD966]">
                      {test.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-slate-900">{test.name}</div>
                      <div className="text-sm font-bold text-slate-500">{test.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Pricing Section */}
      <section id="pricing" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-6xl font-black text-slate-900 mb-6">Transparent Plans</h2>
            <p className="text-xl text-slate-600 font-medium">Choose the tier that fits your health journey.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { plan: "Personal", price: "$0", features: ["Unlimited symptom checks", "Basic health dashboard", "Community support"] },
              { plan: "Premium", price: "$19", features: ["Priority AI analysis", "PDF medical reports", "24/7 Specialist chat"], highlight: true },
              { plan: "Enterprise", price: "$99", features: ["Hospital API access", "Custom ML training", "Dedicated account manager"] }
            ].map((p, i) => (
              <div key={i} className={`p-10 rounded-[3rem] border transition-all duration-500 ${p.highlight ? 'bg-slate-900 text-white shadow-2xl scale-105 border-slate-900' : 'bg-white border-slate-200'}`}>
                <div className="font-black text-xl mb-2">{p.plan}</div>
                <div className="text-5xl font-black mb-8">{p.price}<span className="text-lg opacity-50 font-normal">/mo</span></div>
                <ul className="space-y-4 mb-10">
                  {p.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-3 font-bold text-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.highlight ? 'bg-[#FFD966]' : 'bg-slate-900'}`}></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/pricing')}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${p.highlight ? 'bg-[#FFD966] text-slate-900 hover:opacity-90' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="relative z-20 mt-32">
        <div className="bg-slate-900 text-white pt-32 pb-12 rounded-t-[4rem]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-5 gap-16 mb-24">
              <div className="col-span-2 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#FFD966] rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="font-black text-slate-900 text-3xl">M</span>
                  </div>
                  <div>
                    <span className="font-black text-3xl tracking-tighter">MediPredict</span>
                    <div className="text-xs font-bold text-[#FFD966] uppercase tracking-widest">AI Healthcare Platform</div>
                  </div>
                </div>
                <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                  Revolutionizing healthcare accessibility through artificial intelligence, connecting patients with world-class medical expertise instantly.
                </p>
                <div className="flex gap-4">
                  {[
                    { name: 'LinkedIn', icon: <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" /> },
                    { name: 'Twitter', icon: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /> },
                    { name: 'Facebook', icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
                    { name: 'Instagram', icon: <g><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></g> }
                  ].map((social) => (
                    <div
                      key={social.name}
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FFD966] hover:border-[#FFD966] transition-all duration-300 cursor-pointer group"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:scale-110 group-hover:stroke-slate-900 transition-all">
                        {social.icon}
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { title: 'Product', links: ['Features', 'Pricing', 'API Access', 'Documentation', 'Integrations'] },
                { title: 'Company', links: ['About Us', 'Careers', 'Press Kit', 'Blog', 'Partners'] },
                { title: 'Support', links: ['Help Center', 'Contact', 'Privacy Policy', 'Terms of Service', 'Security'] }
              ].map((section, i) => (
                <div key={i} className="space-y-6">
                  <h4 className="font-black text-[#FFD966] uppercase tracking-widest text-sm">{section.title}</h4>
                  <ul className="space-y-4">
                    {section.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors font-medium text-sm flex items-center gap-2 group">
                          <span className="w-0 group-hover:w-2 h-px bg-[#FFD966] transition-all duration-300"></span>
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-slate-500 text-sm font-medium">© 2026 MediPredict AI. All rights reserved worldwide.</p>
              <div className="flex gap-8 text-slate-400 text-sm font-bold">
                <button className="hover:text-white transition-colors">English (US)</button>
                <button className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD966] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD966]"></span>
                  </span>
                  All Systems Operational
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;