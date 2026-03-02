import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DiseasePrediction = () => {
    const navigate = useNavigate();
    const [botSymptoms, setBotSymptoms] = useState([]);
    const [botInput, setBotInput] = useState('');
    const [botMessages, setBotMessages] = useState([
        {
            id: 1,
            role: 'bot',
            text: "Hello! I'm MediBot, your advanced AI diagnostic assistant. I'll analyze your symptoms using our trained machine learning models to provide a preliminary assessment. Please describe how you're feeling.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [botAnalyzing, setBotAnalyzing] = useState(false);
    const [botResult, setBotResult] = useState(null);
    const [pulseActive, setPulseActive] = useState(false);
    const chatEndRef = useRef(null);

    const commonSymptoms = [
        'Fever', 'Headache', 'Cough', 'Fatigue', 'Nausea',
        'Chest Pain', 'Shortness of Breath', 'Shortness of Breath', 'Back Pain', 'Sore Throat',
        'Muscle Ache', 'Rash', 'Diarrhea', 'Chills', 'Dizziness'
    ];

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [botMessages]);

    const addBotSymptom = (symptom) => {
        const trimmed = symptom?.trim() || botInput.trim();
        if (!trimmed || botSymptoms.includes(trimmed)) {
            if (!trimmed) return;
            setBotInput('');
            return;
        }
        const newSymptoms = [...botSymptoms, trimmed];
        setBotSymptoms(newSymptoms);
        setBotInput('');
        setBotMessages(prev => [...prev,
        { id: Date.now(), role: 'user', text: `Added symptom: ${trimmed}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        {
            id: Date.now() + 1, role: 'bot',
            text: `Got it — "${trimmed}" noted. ${newSymptoms.length < 2
                ? "Add at least one more symptom for a better prediction."
                : `You've added ${newSymptoms.length} symptoms. Ready to analyze, or add more for higher accuracy.`}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        ]);
    };

    const runAnalysis = async () => {
        if (botSymptoms.length === 0) return;
        setBotAnalyzing(true);
        setPulseActive(true);
        setBotMessages(prev => [...prev, {
            id: Date.now(), role: 'bot',
            text: `🔬 Analyzing ${botSymptoms.length} symptom(s) using the ML model... Please wait.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLoading: true
        }]);

        try {
            const response = await fetch('/api/prediction/predict-disease', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symptoms: botSymptoms })
            });
            if (!response.ok) throw new Error('API unavailable');
            const result = await response.json();

            // Format for UI
            const formattedResult = {
                name: result.name || result.predicted_disease,
                accuracy: result.accuracy || result.confidence,
                specialist: result.specialist || 'General Physician',
                description: result.description || `Prediction based on symptoms: ${botSymptoms.join(', ')}`,
                recommendations: result.recommendations || result.precautions || [],
                severity: result.severity || 'Moderate'
            };

            setBotResult(formattedResult);
        } catch (error) {
            console.error('Prediction error:', error);
            // Show error in chat
            setBotMessages(prev => prev.filter(m => !m.isLoading).concat([{
                id: Date.now(), role: 'bot',
                text: `❌ Sorry, there was an error communicating with the ML server. Please try again later.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]));
        } finally {
            setBotAnalyzing(false);
            setPulseActive(false);
        }
    };

    useEffect(() => {
        if (botResult) {
            setBotMessages(prev => prev.filter(m => !m.isLoading).concat([{
                id: Date.now(), role: 'bot',
                text: `✅ Analysis complete! Based on your ${botSymptoms.length} symptoms, the ML model predicts: **${botResult.name}** with ${botResult.accuracy}% confidence.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]));
        }
    }, [botResult]);

    const severityColor = (s) => {
        if (!s) return 'text-slate-500';
        if (s.toLowerCase().includes('high')) return 'text-red-600';
        if (s.toLowerCase().includes('moderate')) return 'text-amber-600';
        return 'text-emerald-600';
    };

    const severityBg = (s) => {
        if (!s) return 'bg-slate-100';
        if (s.toLowerCase().includes('high')) return 'bg-red-50 border-red-200';
        if (s.toLowerCase().includes('moderate')) return 'bg-amber-50 border-amber-200';
        return 'bg-emerald-50 border-emerald-200';
    };

    return (
        <div className="min-h-screen pt-10 pb-20 px-4" style={{ background: '#f0f4f8', fontFamily: "'DM Sans', sans-serif" }}>
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* Left Side: Bot Chat */}
                <div className="flex-1 bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border border-slate-200" style={{ height: '80vh' }}>

                    {/* Header */}
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${pulseActive ? 'animate-pulse' : ''}`} style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>🤖</div>
                            <div>
                                <h1 className="text-white font-bold text-lg">MediBot Predictor</h1>
                                <p className="text-blue-200 text-xs">ML-Powered Health Assistant</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all">Back to Dashboard</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                        {botMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'bot' && (
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1 shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>🤖</div>
                                )}
                                <div className="max-w-xs lg:max-w-sm">
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-md'
                                        : 'bg-white text-slate-700 rounded-tl-md border border-slate-200'
                                        } ${msg.isLoading ? 'animate-pulse' : ''}`}>
                                        {msg.text}
                                        {msg.isLoading && <span className="ml-2 inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>}
                                    </div>
                                    <div className={`text-xs text-slate-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{msg.time}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Symptoms */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-white">
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Common Symptoms</p>
                        <div className="flex flex-wrap gap-2">
                            {commonSymptoms.map(s => (
                                <button key={s} onClick={() => addBotSymptom(s)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${botSymptoms.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}>
                                    {botSymptoms.includes(s) ? '✓ ' : '+ '}{s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex gap-3">
                            <input
                                value={botInput}
                                onChange={e => setBotInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addBotSymptom()}
                                placeholder="Describe a symptom..."
                                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => addBotSymptom()} disabled={!botInput.trim()}
                                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50">
                                Add
                            </button>
                            <button onClick={runAnalysis} disabled={botSymptoms.length === 0 || botAnalyzing}
                                className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2">
                                {botAnalyzing ? "Analyzing..." : "Analyze"}
                            </button>
                        </div>
                        {botSymptoms.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 animate-fadeIn">
                                {botSymptoms.map((s, i) => (
                                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                        {s}
                                        <button onClick={() => { setBotSymptoms(prev => prev.filter(x => x !== s)); setBotResult(null); }} className="hover:text-red-500 transition-colors">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Analysis Results */}
                <div className="w-full lg:w-96 flex flex-col gap-6">
                    {botResult ? (
                        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200 space-y-6 animate-fadeIn">
                            <h2 className="text-xl font-bold text-slate-900 border-b pb-4 border-slate-100">Analysis Results</h2>

                            <div className="rounded-2xl p-6 text-white overflow-hidden relative shadow-lg" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10" />
                                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">Likely Condition</p>
                                <h3 className="text-2xl font-black mb-3">{botResult.name}</h3>
                                <p className="text-slate-300 text-xs leading-relaxed mb-6">{botResult.description}</p>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-xs font-bold">ML Confidence</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${botResult.accuracy}%` }} />
                                        </div>
                                        <span className="text-white font-black text-sm">{botResult.accuracy}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-2xl p-4 border ${severityBg(botResult.severity)}`}>
                                <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Severity Level</p>
                                <p className={`text-sm font-black ${severityColor(botResult.severity)}`}>{botResult.severity}</p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Recommended Specialist</p>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">👨‍⚕️</div>
                                    <p className="font-bold text-slate-800">{botResult.specialist}</p>
                                </div>
                                <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all">Book Appointment Now</button>
                            </div>

                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider">Recommendations</p>
                                <ul className="space-y-2">
                                    {botResult.recommendations?.map((r, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] text-amber-700 leading-relaxed italic">
                                ⚠️ This is an AI prediction. Please do not self-diagnose. Consult a doctor for any health concerns.
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-xl p-12 border border-slate-200 flex flex-col items-center justify-center text-center space-y-4" style={{ minHeight: '400px' }}>
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl shadow-inner">🔬</div>
                            <h2 className="text-xl font-bold text-slate-800">Awaiting Input</h2>
                            <p className="text-slate-400 text-sm max-w-xs">Enter at least 2 symptoms in the chat and click "Analyze" to see ML predictions here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiseasePrediction;
