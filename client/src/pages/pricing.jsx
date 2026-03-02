import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PricingPage = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeFaq, setActiveFaq] = useState(null);

  const basePrices = { pro: 29, proPlus: 59 };
  const discount = 0.8; // 20% off for annual

  const getPrice = (base) => {
    return billingCycle === 'monthly'
      ? base
      : Math.round(base * discount);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const faqs = [
    { q: "Can I switch plans later?", a: "Absolutely! You can upgrade or downgrade your plan at any time through your account settings." },
    { q: "Is my data secure?", a: "We use bank-level encryption (AES-256) to ensure your health data remains private and secure." },
    { q: "Do you offer refunds?", a: "Yes, we offer a 14-day money-back guarantee if you're not completely satisfied with our service." },
    { q: "Is this a substitute for a doctor?", a: "No. MediPredict is an AI-assisted tool for preliminary analysis. Always consult a real doctor for medical advice." }
  ];

  return (
    <div className="min-h-screen bg-[#F2F2EB] text-slate-800 font-sans selection:bg-[#FFD966] overflow-x-hidden">

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFD966]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDgsIDE2MywgMTg0LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg">
              <span className="font-black text-[#FFD966] text-xl">M</span>
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900">MediPredict</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-full border border-slate-200 font-bold text-sm hover:bg-white hover:shadow-md transition-all text-slate-600 hover:text-slate-900"
          >
            Back to Home
          </button>
        </div>
      </nav>

      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-block px-4 py-1 bg-[#FFD966] rounded-full text-slate-900 font-black text-xs uppercase tracking-widest mb-6">
              Simple Pricing
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Invest in your <br /><span className="text-transparent bg-clip-text bg-linear-to-r from-slate-900 to-slate-500">Health Journey</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium">
              Transparent pricing. No hidden fees. Cancel anytime.
            </p>
          </motion.div>

          {/* Billing Tunnel */}
          <div className="flex justify-center mb-16">
            <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-slate-100 flex items-center relative">
              <motion.div
                className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl shadow-md"
                initial={false}
                animate={{
                  width: '50%',
                  x: billingCycle === 'monthly' ? 0 : '100%'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-8 py-3 rounded-xl font-bold text-sm transition-colors duration-300 w-40 ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative z-10 px-8 py-3 rounded-xl font-bold text-sm transition-colors duration-300 w-40 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Yearly <span className="absolute -top-3 -right-3 bg-[#FFD966] text-slate-900 text-[10px] px-2 py-0.5 rounded-full shadow-sm">-20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid lg:grid-cols-3 gap-8 items-center"
          >
            {/* Free Plan */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/50 shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900">Personal</h3>
                <p className="text-slate-500 font-medium mt-2">Essential AI health tools for individuals.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-slate-400 font-bold">/mo</span>
              </div>
              <button className="w-full py-4 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors mb-8">
                Get Started
              </button>
              <ul className="space-y-4">
                {['Basic Symptom Analysis', 'Health Dashboard', 'Community Support', 'Regular Health Tips'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Pro Plan (Highlighted) */}
            <motion.div variants={itemVariants} className="relative bg-slate-900 p-10 rounded-[3rem] shadow-2xl scale-105 z-10 border border-slate-700">
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-[#FFD966] text-slate-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-white">Pro</h3>
                <p className="text-slate-400 font-medium mt-2">Advanced diagnostics for health enthusiasts.</p>
              </div>
              <div className="mb-8">
                <span className="text-6xl font-black text-white">${getPrice(basePrices.pro)}</span>
                <span className="text-slate-500 font-bold">/mo</span>
                {billingCycle === 'yearly' && <div className="text-sm text-[#FFD966] font-bold mt-1">Billed ${getPrice(basePrices.pro) * 12} yearly</div>}
              </div>
              <button
                onClick={() => alert(`Selected Pro Plan (${billingCycle})`)}
                className="w-full py-5 rounded-2xl bg-[#FFD966] text-slate-900 font-black hover:bg-white transition-all shadow-lg hover:shadow-xl mb-10 transform hover:scale-[1.02]"
              >
                Start Pro Trial
              </button>
              <ul className="space-y-5">
                {['Everything in Personal', 'Unlimited AI Analysis', 'Priority Doctor Matching', 'PDF Health Reports', '24/7 Chat Support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-white">
                    <div className="w-6 h-6 rounded-full bg-[#FFD966] flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/50 shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900">Family</h3>
                <p className="text-slate-500 font-medium mt-2">Complete coverage for your whole family.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-slate-900">${getPrice(basePrices.proPlus)}</span>
                <span className="text-slate-400 font-bold">/mo</span>
              </div>
              <button className="w-full py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-900 font-bold hover:border-slate-900 transition-colors mb-8">
                Get Started
              </button>
              <ul className="space-y-4">
                {['Up to 5 Family Members', 'Dedicated Health Manager', 'Genetic Analysis', 'Hospital API Access', 'Custom Integrations'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Feature Comparison / FAQ Section */}
          <div className="mt-32 max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-center text-slate-900 mb-16">Common Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between font-bold text-lg text-slate-900"
                  >
                    {faq.q}
                    <span className={`transform transition-transform duration-300 ${activeFaq === index ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>
                  <AnimatePresence>
                    {activeFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden bg-slate-50"
                      >
                        <p className="p-6 pt-0 text-slate-600 leading-relaxed font-medium">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 text-center">
            <p className="text-slate-500 font-medium mb-4">Still have questions?</p>
            <button className="text-slate-900 font-black underline decoration-[#FFD966] decoration-4 underline-offset-4 hover:decoration-slate-900 transition-all">
              Contact our support team
            </button>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-lg">MediPredict</span>
            <span className="text-slate-400">© 2026</span>
          </div>
          <div className="flex gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
      `}</style>

    </div>
  );
};

export default PricingPage;