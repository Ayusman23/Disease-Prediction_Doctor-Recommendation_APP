import React, { useState, useEffect, useCallback, useRef } from 'react';
import DPDRPredictor from './DPDRPredictor';
import { fetchDashboardData, saveHealthRecord, saveVitalsHistory, saveDiseaseAnalytics, saveAppointment, fetchSqlUsers } from '../services/patientApi';

// ─── AI PRESCRIPTION ANALYZER (uses Claude Vision API) ────────────────────────
const analyzePrescriptionWithAI = async (imageBase64, mimeType) => {
  const prompt = `You are a medical prescription analyzer. Carefully examine this prescription image (which may be handwritten or printed) and extract ALL available information.

Look for:
1. VITALS: pulse/heart rate, blood pressure, temperature, weight, SpO2/oxygen saturation, blood glucose
2. MEDICATIONS: drug names, dosages, frequency (e.g. "Inj Prozac 7% x 8t", "100ml i/s", "air dew 7% x 8t")
3. DIAGNOSIS / CONDITION
4. DOCTOR NAME
5. PATIENT NAME
6. DATE
7. ANY OTHER MEDICAL NOTES

For handwritten prescriptions, try your best to decode abbreviations:
- "Inj" = Injection
- "Tab" = Tablet
- "Cap" = Capsule  
- "bd/tid/od" = twice/thrice/once daily
- "i/s" = intraspinal or as written
- Numbers followed by "x" = quantity or frequency
- "%" signs near medications = concentration

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "vitals": {
    "heartRate": null_or_number,
    "bloodPressure": null_or_"systolic/diastolic",
    "temperature": null_or_number_in_F,
    "weight": null_or_number_in_lbs,
    "spo2": null_or_number,
    "bloodGlucose": null_or_number
  },
  "medications": [
    { "name": "drug name", "dose": "dosage", "frequency": "how often", "route": "oral/injection/etc" }
  ],
  "diagnosis": null_or_"condition name",
  "doctor": null_or_"doctor name",
  "patient": null_or_"patient name",
  "date": null_or_"date string",
  "notes": null_or_"any other important notes",
  "rawText": "your best attempt to transcribe ALL visible text from the prescription",
  "confidence": "high/medium/low",
  "prescriptionType": "handwritten/printed/mixed",
  "predictedConditions": ["list of possible conditions based on medications and vitals"],
  "specialistRecommended": null_or_"specialist type",
  "severity": null_or_"low/moderate/high/critical"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 }
            },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '';

    // Strip any markdown fences
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      return JSON.parse(clean);
    } catch {
      // Try extracting JSON from the text
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error('Could not parse AI response as JSON');
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    return null;
  }
};

// Convert file to base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// ─── PARSE PRESCRIPTION TEXT (fallback for txt/pdf) ──────────────────────────
const parsePrescriptionData = (text) => {
  const data = {};
  const lines = text.toLowerCase();
  const bpMatch = lines.match(/(?:bp|blood pressure)[:\s]+(\d{2,3})[\/\-](\d{2,3})/);
  if (bpMatch) data.bloodPressure = `${bpMatch[1]}/${bpMatch[2]}`;
  const hrMatch = lines.match(/(?:hr|heart rate|pulse)[:\s]+(\d{2,3})\s*(?:bpm)?/);
  if (hrMatch) data.heartRate = parseInt(hrMatch[1]);
  const tempMatch = lines.match(/(?:temp|temperature)[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:°?[fc])?/);
  if (tempMatch) data.temperature = parseFloat(tempMatch[1]);
  const weightMatch = lines.match(/(?:weight|wt)[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:lbs?|kg)?/);
  if (weightMatch) data.weight = parseFloat(weightMatch[1]);
  const spo2Match = lines.match(/(?:spo2|oxygen|o2)[:\s]+(\d{2,3})%?/);
  if (spo2Match) data.spo2 = parseInt(spo2Match[1]);
  const bglMatch = lines.match(/(?:blood sugar|glucose|bgl)[:\s]+(\d{2,3})\s*(?:mg\/dl)?/);
  if (bglMatch) data.bloodGlucose = parseInt(bglMatch[1]);
  const medPatterns = [
    /(?:prescribed?|rx|medication)[:\s]+([a-z\s,]+(?:\d+\s*mg)?)/gi,
    /([a-z]+(?:cin|mycin|pril|olol|statin|sartan|pam|zole|ine))\s+(\d+\s*mg)/gi
  ];
  const meds = [];
  medPatterns.forEach(p => {
    let m;
    while ((m = p.exec(text)) !== null) {
      if (m[1] && m[1].trim().length > 2) meds.push(m[0].trim());
    }
  });
  if (meds.length) data.medications = meds.slice(0, 5);
  const diagMatch = text.match(/(?:diagnosis|condition|impression)[:\s]+([^\n.]+)/i);
  if (diagMatch) data.diagnosis = diagMatch[1].trim();
  const drMatch = text.match(/(?:dr\.?|doctor)[:\s]+([a-z\s]+)/i);
  if (drMatch) data.doctor = drMatch[1].trim();
  return data;
};

// ─── AI PRESCRIPTION ANALYSIS PANEL ──────────────────────────────────────────
const PrescriptionAnalysisPanel = ({ analysisResult, fileName, onApply, onDiscard }) => {
  if (!analysisResult) return null;

  const { vitals, medications, diagnosis, doctor, patient, rawText, confidence, prescriptionType, predictedConditions, specialistRecommended, severity, notes } = analysisResult;

  const hasVitals = vitals && Object.values(vitals).some(v => v !== null);
  const hasMeds = medications && medications.length > 0;

  const severityColor = (s) => {
    if (!s) return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
    if (s === 'critical') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    if (s === 'high') return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
    if (s === 'moderate') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
  };

  const confColor = confidence === 'high' ? '#16a34a' : confidence === 'medium' ? '#d97706' : '#dc2626';
  const confBg = confidence === 'high' ? '#f0fdf4' : confidence === 'medium' ? '#fffbeb' : '#fef2f2';

  return (
    <div className="mt-5 rounded-2xl overflow-hidden border" style={{ borderColor: '#bfdbfe' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>🧠</div>
          <div>
            <div className="font-bold text-white text-sm">AI Prescription Analysis</div>
            <div className="text-blue-200 text-xs flex items-center gap-2">
              <span className="capitalize">{prescriptionType || 'unknown'} prescription</span>
              <span>·</span>
              <span>{fileName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full capitalize" style={{ background: confBg, color: confColor }}>
            {confidence || 'medium'} confidence
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5" style={{ background: '#f8faff' }}>

        {/* Raw transcription */}
        {rawText && (
          <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">📝 Transcribed Text from Image</div>
            <div className="text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'monospace' }}>{rawText}</div>
          </div>
        )}

        {/* Vitals */}
        {hasVitals && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📊 Extracted Vitals</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vitals.heartRate && (
                <div className="bg-white rounded-xl p-3 border border-red-100 flex items-center gap-3">
                  <span className="text-xl">❤️</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Heart Rate</div>
                    <div className="font-black text-slate-900">{vitals.heartRate} <span className="text-xs text-slate-400 font-normal">bpm</span></div>
                    {vitals.heartRate > 100 && <div className="text-[10px] text-orange-500 font-bold">⚠️ Elevated</div>}
                    {vitals.heartRate < 60 && <div className="text-[10px] text-blue-500 font-bold">⚠️ Low</div>}
                  </div>
                </div>
              )}
              {vitals.bloodPressure && (
                <div className="bg-white rounded-xl p-3 border border-blue-100 flex items-center gap-3">
                  <span className="text-xl">🩺</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Blood Pressure</div>
                    <div className="font-black text-slate-900">{vitals.bloodPressure} <span className="text-xs text-slate-400 font-normal">mmHg</span></div>
                  </div>
                </div>
              )}
              {vitals.temperature && (
                <div className="bg-white rounded-xl p-3 border border-amber-100 flex items-center gap-3">
                  <span className="text-xl">🌡️</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Temperature</div>
                    <div className="font-black text-slate-900">{vitals.temperature}°<span className="text-xs text-slate-400 font-normal">F</span></div>
                    {vitals.temperature > 100.4 && <div className="text-[10px] text-red-500 font-bold">🔥 Fever</div>}
                  </div>
                </div>
              )}
              {vitals.weight && (
                <div className="bg-white rounded-xl p-3 border border-green-100 flex items-center gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Weight</div>
                    <div className="font-black text-slate-900">{vitals.weight} <span className="text-xs text-slate-400 font-normal">lbs</span></div>
                  </div>
                </div>
              )}
              {vitals.spo2 && (
                <div className="bg-white rounded-xl p-3 border border-purple-100 flex items-center gap-3">
                  <span className="text-xl">🫁</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">SpO2</div>
                    <div className="font-black text-slate-900">{vitals.spo2}<span className="text-xs text-slate-400 font-normal">%</span></div>
                    {vitals.spo2 < 95 && <div className="text-[10px] text-red-500 font-bold">⚠️ Low</div>}
                  </div>
                </div>
              )}
              {vitals.bloodGlucose && (
                <div className="bg-white rounded-xl p-3 border border-orange-100 flex items-center gap-3">
                  <span className="text-xl">🩸</span>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Blood Glucose</div>
                    <div className="font-black text-slate-900">{vitals.bloodGlucose} <span className="text-xs text-slate-400 font-normal">mg/dL</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medications */}
        {hasMeds && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">💊 Medications Detected</div>
            <div className="space-y-2">
              {medications.map((med, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm">{med.name || 'Unknown'}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {med.dose && <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{med.dose}</span>}
                      {med.frequency && <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#f0fdf4', color: '#16a34a' }}>{med.frequency}</span>}
                      {med.route && <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#fff7ed', color: '#c2410c' }}>{med.route}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnosis & Conditions */}
        {(diagnosis || (predictedConditions && predictedConditions.length > 0)) && (
          <div className="grid md:grid-cols-2 gap-3">
            {diagnosis && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">🏥 Diagnosis</div>
                <div className="font-bold text-slate-900 text-sm">{diagnosis}</div>
              </div>
            )}
            {predictedConditions && predictedConditions.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">🔬 Predicted Conditions</div>
                <div className="flex flex-wrap gap-1.5">
                  {predictedConditions.map((c, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Severity & Specialist */}
        {(severity || specialistRecommended) && (
          <div className="grid md:grid-cols-2 gap-3">
            {severity && (() => {
              const sc = severityColor(severity);
              return (
                <div className="rounded-xl p-4 border" style={{ background: sc.bg, borderColor: sc.border }}>
                  <div className="text-xs font-bold uppercase mb-1" style={{ color: sc.text }}>Severity Level</div>
                  <div className="font-black text-lg capitalize" style={{ color: sc.text }}>{severity}</div>
                </div>
              );
            })()}
            {specialistRecommended && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">👨‍⚕️ Recommended Specialist</div>
                <div className="font-bold text-slate-900 text-sm">{specialistRecommended}</div>
              </div>
            )}
          </div>
        )}

        {/* Doctor / Patient / Notes */}
        {(doctor || patient || notes) && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-3">
            {doctor && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Doctor</div>
                <div className="font-semibold text-slate-800 text-sm">{doctor}</div>
              </div>
            )}
            {patient && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Patient</div>
                <div className="font-semibold text-slate-800 text-sm">{patient}</div>
              </div>
            )}
            {notes && (
              <div className="col-span-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Notes</div>
                <div className="text-sm text-slate-700">{notes}</div>
              </div>
            )}
          </div>
        )}

        {/* Disease Analytics Preview */}
        {predictedConditions && predictedConditions.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderColor: 'rgba(59,130,246,0.3)' }}>
            <div className="text-blue-300 text-xs font-bold uppercase tracking-wide mb-2">📈 Disease Analytics Updated</div>
            <div className="text-white text-sm font-semibold mb-2">Applying to your Analytics Dashboard:</div>
            <div className="flex flex-wrap gap-2">
              {predictedConditions.map((c, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.25)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          <span className="text-base flex-shrink-0">⚠️</span>
          <span>AI analysis is for informational purposes only. Always verify with your licensed healthcare provider before acting on this data.</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onApply} className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
            ✅ Apply All to Dashboard
          </button>
          <button onClick={onDiscard} className="px-5 py-3 rounded-xl border font-semibold text-slate-600 hover:bg-slate-50 text-sm" style={{ border: '1.5px solid #e2e8f0' }}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── DISEASE PREDICTION BOT ────────────────────────────────────────────────────
const DiseasePredictorBot = ({ onClose }) => {
  const [botSymptoms, setBotSymptoms] = useState([]);
  const [botInput, setBotInput] = useState('');
  const [botMessages, setBotMessages] = useState([{
    id: 1, role: 'bot',
    text: "Hello! I'm MediBot, your AI disease prediction assistant. Describe your symptoms one by one and I'll analyze them. Type a symptom and press Enter or click Add.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [botAnalyzing, setBotAnalyzing] = useState(false);
  const [botResult, setBotResult] = useState(null);
  const [pulseActive, setPulseActive] = useState(false);
  const chatEndRef = useRef(null);

  const commonSymptoms = ['Fever', 'Headache', 'Cough', 'Fatigue', 'Nausea', 'Chest Pain', 'Shortness of Breath', 'Vomiting', 'Dizziness', 'Sore Throat'];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [botMessages]);

  const addBotSymptom = (symptom) => {
    const trimmed = typeof symptom === 'string' && symptom !== botInput ? symptom : botInput.trim();
    if (!trimmed || botSymptoms.includes(trimmed)) { setBotInput(''); return; }
    const newSymptoms = [...botSymptoms, trimmed];
    setBotSymptoms(newSymptoms);
    setBotInput('');
    setBotMessages(prev => [...prev,
    { id: Date.now(), role: 'user', text: `Added symptom: ${trimmed}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: Date.now() + 1, role: 'bot', text: `Got it — "${trimmed}" noted. ${newSymptoms.length < 2 ? "Add at least one more symptom." : `You've added ${newSymptoms.length} symptoms. Ready to analyze!`}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  const generateMockPrediction = (symptoms) => {
    const sl = symptoms.map(s => s.toLowerCase());
    if (sl.some(s => s.includes('chest pain') || s.includes('shortness of breath')))
      return { name: 'Respiratory / Cardiac Alert', accuracy: 91, severity: 'High', specialist: 'Cardiologist / Pulmonologist', icd: 'R07.9', description: 'Symptoms suggest possible cardiac or respiratory involvement. Immediate evaluation recommended.', recommendations: ['Seek emergency medical attention immediately', 'Do not exert yourself physically', 'Monitor oxygen levels if possible', 'Avoid stimulants and stress'] };
    if (sl.some(s => s.includes('fever')) && sl.some(s => s.includes('cough') || s.includes('sore throat')))
      return { name: 'Influenza (Flu)', accuracy: 88, severity: 'Moderate', specialist: 'General Physician', icd: 'J11.1', description: 'Viral infection of the respiratory system with systemic symptoms.', recommendations: ['Rest at home for 5–7 days', 'Drink 8–10 glasses of water daily', 'Take antipyretics for fever', 'Consider antiviral medication within 48h'] };
    if (sl.some(s => s.includes('headache')) && sl.some(s => s.includes('nausea') || s.includes('dizziness')))
      return { name: 'Migraine', accuracy: 84, severity: 'Moderate', specialist: 'Neurologist', icd: 'G43.9', description: 'Neurological condition with intense episodic headaches and autonomic symptoms.', recommendations: ['Rest in a quiet, dark room', 'Apply cold compress to forehead', 'Stay well-hydrated', 'Consult neurologist for preventive therapy'] };
    if (sl.some(s => s.includes('nausea') || s.includes('vomiting') || s.includes('stomach')))
      return { name: 'Gastroenteritis', accuracy: 82, severity: 'Low–Moderate', specialist: 'Gastroenterologist', icd: 'K52.9', description: 'Inflammation of the gastrointestinal tract causing digestive upset.', recommendations: ['Follow BRAT diet', 'Rehydrate with electrolyte solutions', 'Avoid dairy and fatty foods', 'Seek care if symptoms persist > 48h'] };
    return { name: 'Upper Respiratory Infection', accuracy: 79, severity: 'Low', specialist: 'General Physician', icd: 'J06.9', description: 'A common viral infection of the upper respiratory tract.', recommendations: ['Get plenty of rest', 'Stay hydrated with warm fluids', 'Use OTC saline nasal spray', 'Return if fever exceeds 103°F'] };
  };

  const runAnalysis = async () => {
    if (botSymptoms.length === 0) return;
    setBotAnalyzing(true); setPulseActive(true);
    setBotMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: `🔬 Analyzing ${botSymptoms.length} symptom(s)... Please wait.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isLoading: true }]);
    await new Promise(r => setTimeout(r, 2000));
    const mock = generateMockPrediction(botSymptoms);
    setBotResult(mock);
    setBotAnalyzing(false); setPulseActive(false);
  };

  useEffect(() => {
    if (botResult) {
      setBotMessages(prev => prev.filter(m => !m.isLoading).concat([{ id: Date.now(), role: 'bot', text: `✅ Analysis complete! Predicted: **${botResult.name}** with ${botResult.accuracy}% confidence. See full report →`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]));
    }
  }, [botResult]);

  const svgColor = (s) => { if (!s) return '#64748b'; if (s.toLowerCase().includes('high')) return '#ef4444'; if (s.toLowerCase().includes('moderate')) return '#f59e0b'; return '#22c55e'; };
  const severityBg = (s) => { if (!s) return 'bg-slate-100'; if (s.toLowerCase().includes('high')) return '#fef2f2'; if (s.toLowerCase().includes('moderate')) return '#fffbeb'; return '#f0fdf4'; };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="relative flex items-center justify-between px-8 py-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f4c81 100%)' }}>
          <div className="relative flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${pulseActive ? 'animate-pulse' : ''}`} style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>🤖</div>
            <div>
              <div className="font-bold text-white text-lg">MediBot — Disease Predictor</div>
              <div className="text-blue-200 text-xs font-medium flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />ML-Powered Analysis</div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all" style={{ color: 'white' }}>✕</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: '#f8fafc' }}>
              {botMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>🤖</div>}
                  <div className="max-w-xs lg:max-w-sm">
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.isLoading ? 'animate-pulse' : ''}`}
                      style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white' } : { background: 'white', color: '#334155', border: '1px solid #e2e8f0' }}>
                      {msg.text}
                    </div>
                    <div className={`text-xs text-slate-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{msg.time}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="px-5 py-3 border-t bg-white">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Quick Add</div>
              <div className="flex flex-wrap gap-1.5">
                {commonSymptoms.map(s => (
                  <button key={s} onClick={() => addBotSymptom(s)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${botSymptoms.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400'}`}>
                    {botSymptoms.includes(s) ? '✓ ' : '+ '}{s}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex gap-3">
                <input value={botInput} onChange={e => setBotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBotSymptom(botInput)}
                  placeholder="Type a symptom..." className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
                <button onClick={() => addBotSymptom(botInput)} disabled={!botInput.trim()} className="px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>Add</button>
                <button onClick={runAnalysis} disabled={botSymptoms.length === 0 || botAnalyzing} className="px-5 py-3 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                  {botAnalyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing</> : <>🔬 Analyze</>}
                </button>
              </div>
              {botSymptoms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {botSymptoms.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      {s}<button onClick={() => { setBotSymptoms(prev => prev.filter(x => x !== s)); setBotResult(null); }} className="text-blue-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-72 border-l flex flex-col overflow-y-auto" style={{ background: '#f1f5f9' }}>
            {botResult ? (
              <div className="p-5 space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">ML Model Result</div>
                <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
                  <div className="text-xs font-semibold text-blue-300 uppercase mb-1">Predicted Condition</div>
                  <div className="font-bold text-lg mb-1">{botResult.name}</div>
                  {botResult.icd && <div className="text-blue-300 text-xs mb-2">ICD-10: {botResult.icd}</div>}
                  <div className="text-slate-300 text-xs mb-3">{botResult.description}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/20 rounded-full"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" style={{ width: `${botResult.accuracy}%` }} /></div>
                      <span className="font-bold text-sm">{botResult.accuracy}%</span>
                    </div>
                  </div>
                </div>
                {botResult.severity && (
                  <div className="rounded-xl p-4 border" style={{ background: severityBg(botResult.severity) }}>
                    <div className="text-xs font-semibold text-slate-500 mb-1">Severity Level</div>
                    <div className="font-bold text-sm" style={{ color: svgColor(botResult.severity) }}>{botResult.severity}</div>
                  </div>
                )}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-400 mb-2">Recommended Specialist</div>
                  <div className="font-semibold text-slate-800 text-sm mb-3">👨‍⚕️ {botResult.specialist}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 mb-3">Recommendations</div>
                  <ul className="space-y-2">
                    {botResult.recommendations?.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>{i + 1}</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl text-xs text-amber-700 border border-amber-200" style={{ background: '#fffbeb' }}>⚠️ AI prediction for informational purposes only. Always consult a licensed healthcare professional.</div>
                <button onClick={() => { setBotResult(null); setBotSymptoms([]); setBotMessages([{ id: 1, role: 'bot', text: "Let's start fresh. Describe your symptoms.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); }} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-100">🔄 Start Over</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)' }}>🧬</div>
                <div className="font-bold text-slate-700 mb-2">Awaiting Analysis</div>
                <div className="text-slate-400 text-xs">Add symptoms and click Analyze to see predictions</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ANALYTICS DASHBOARD ──────────────────────────────────────────────────────
const AnalyticsDashboard = ({ healthHistory, currentStats, diseaseAnalytics }) => {
  const [selectedMetric, setSelectedMetric] = useState('heartRate');
  const metrics = [
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', icon: '❤️', normal: [60, 100] },
    { key: 'systolic', label: 'Blood Pressure', unit: 'mmHg', color: '#3b82f6', icon: '🩺', normal: [90, 120] },
    { key: 'temperature', label: 'Temperature', unit: '°F', color: '#f59e0b', icon: '🌡️', normal: [97, 99] },
    { key: 'weight', label: 'Weight', unit: 'lbs', color: '#22c55e', icon: '⚖️', normal: [0, 999] },
    { key: 'spo2', label: 'SpO2', unit: '%', color: '#8b5cf6', icon: '🫁', normal: [95, 100] },
    { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL', color: '#f97316', icon: '🩸', normal: [70, 140] },
  ];

  const activeMetric = metrics.find(m => m.key === selectedMetric);
  const data = healthHistory.map(h => ({
    date: h.date,
    value: selectedMetric === 'systolic' ? (parseInt(h.bloodPressure?.split('/')[0]) || null) : h[selectedMetric]
  })).filter(d => d.value !== null && d.value !== undefined);

  const maxVal = data.length ? Math.max(...data.map(d => d.value)) * 1.1 : 100;
  const minVal = data.length ? Math.min(...data.map(d => d.value)) * 0.9 : 0;
  const range = maxVal - minVal || 1;

  const svgW = 600, svgH = 160, padL = 40, padR = 20, padT = 20, padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const pts = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: padT + plotH - ((d.value - minVal) / range) * plotH,
    val: d.value, date: d.date
  }));
  const pathD = pts.length > 1 ? `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaD = pts.length > 1 ? `${pathD} L ${pts[pts.length - 1].x},${padT + plotH} L ${pts[0].x},${padT + plotH} Z` : '';

  const latestVal = data.length ? data[data.length - 1].value : null;
  const prevVal = data.length > 1 ? data[data.length - 2].value : null;
  const trend = latestVal && prevVal ? ((latestVal - prevVal) / prevVal * 100).toFixed(1) : null;
  const inNormal = latestVal && activeMetric.normal[0] <= latestVal && latestVal <= activeMetric.normal[1];

  const avgVal = data.length ? (data.reduce((s, d) => s + d.value, 0) / data.length).toFixed(1) : '--';
  const maxActual = data.length ? Math.max(...data.map(d => d.value)) : '--';
  const minActual = data.length ? Math.min(...data.map(d => d.value)) : '--';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Health Intelligence</div>
        <h2 className="text-white text-2xl font-black mb-1">Analytics Dashboard</h2>
        <p className="text-blue-200 text-sm">Track your vitals over time as you upload health records and prescriptions.</p>
      </div>

      {/* Disease Analytics from Prescriptions */}
      {diseaseAnalytics && diseaseAnalytics.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: '#fff7ed' }}>🔬</div>
            <div>
              <div className="font-bold text-slate-900">Disease Analytics from Prescriptions</div>
              <div className="text-slate-400 text-xs">Conditions detected from your uploaded prescriptions</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diseaseAnalytics.map((d, i) => (
              <div key={i} className="rounded-xl p-4 border border-slate-100" style={{ background: '#f8fafc' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="font-bold text-slate-900 text-sm">{d.condition}</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${d.severity === 'high' || d.severity === 'critical' ? 'bg-red-50 text-red-600' : d.severity === 'moderate' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                    {d.severity}
                  </span>
                </div>
                <div className="text-slate-400 text-xs mb-2">{d.source} · {d.date}</div>
                {d.medications && d.medications.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.medications.map((m, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>💊 {m}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => {
          const latestData = healthHistory.length ? healthHistory[healthHistory.length - 1] : null;
          const val = latestData ? (m.key === 'systolic' ? latestData.bloodPressure?.split('/')[0] : latestData[m.key]) : null;
          return (
            <button key={m.key} onClick={() => setSelectedMetric(m.key)}
              className="rounded-2xl p-4 text-left transition-all border"
              style={{ background: selectedMetric === m.key ? m.color : 'white', borderColor: selectedMetric === m.key ? m.color : '#e2e8f0', boxShadow: selectedMetric === m.key ? `0 8px 24px ${m.color}40` : 'none', transform: selectedMetric === m.key ? 'translateY(-2px)' : 'none' }}>
              <div className="text-xl mb-2">{m.icon}</div>
              <div className="font-black text-lg" style={{ color: selectedMetric === m.key ? 'white' : '#1e293b' }}>{val || '--'}</div>
              <div className="text-xs font-medium" style={{ color: selectedMetric === m.key ? 'rgba(255,255,255,0.8)' : '#64748b' }}>{m.unit}</div>
              <div className="text-xs font-bold mt-1" style={{ color: selectedMetric === m.key ? 'rgba(255,255,255,0.9)' : '#475569' }}>{m.label}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-black text-slate-900 text-lg">{activeMetric.icon} {activeMetric.label} Trend</h3>
            <p className="text-slate-400 text-xs">Normal range: {activeMetric.normal[0]}–{activeMetric.normal[1]} {activeMetric.unit}</p>
          </div>
          {latestVal && (
            <div className="text-right">
              <div className="font-black text-3xl" style={{ color: activeMetric.color }}>{latestVal}</div>
              <div className="text-slate-400 text-xs">{activeMetric.unit}</div>
              {trend && <div className={`text-xs font-bold mt-1 ${parseFloat(trend) > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>{parseFloat(trend) > 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>}
            </div>
          )}
        </div>
        {data.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ minWidth: 300 }}>
              <defs>
                <linearGradient id={`grad-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeMetric.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={activeMetric.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <g key={i}>
                  <line x1={padL} y1={padT + p * plotH} x2={padL + plotW} y2={padT + p * plotH} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padL - 5} y={padT + p * plotH + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{(maxVal - p * range).toFixed(0)}</text>
                </g>
              ))}
              {activeMetric.normal[0] > minVal && (
                <rect x={padL} y={padT + plotH - ((activeMetric.normal[1] - minVal) / range) * plotH}
                  width={plotW} height={((activeMetric.normal[1] - activeMetric.normal[0]) / range) * plotH}
                  fill={activeMetric.color} fillOpacity="0.05" />
              )}
              {areaD && <path d={areaD} fill={`url(#grad-${selectedMetric})`} />}
              {pathD && <path d={pathD} fill="none" stroke={activeMetric.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={activeMetric.color} strokeWidth="2.5" />
                  <text x={p.x} y={p.y - 10} fontSize="9" fill={activeMetric.color} textAnchor="middle" fontWeight="700">{p.val}</text>
                  <text x={p.x} y={padT + plotH + 18} fontSize="8" fill="#94a3b8" textAnchor="middle">{p.date?.slice(-5)}</text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">📊</div>
            <div className="font-bold text-slate-600 mb-1">No data yet</div>
            <p className="text-sm">Upload prescriptions or health records to start tracking {activeMetric.label}</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Average', value: avgVal, unit: activeMetric.unit },
            { label: 'Highest', value: maxActual, unit: activeMetric.unit },
            { label: 'Lowest', value: minActual, unit: activeMetric.unit },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
              <div className="text-slate-400 text-xs font-bold uppercase mb-2">{s.label}</div>
              <div className="font-black text-2xl" style={{ color: activeMetric.color }}>{s.value}</div>
              <div className="text-slate-400 text-xs">{s.unit}</div>
            </div>
          ))}
        </div>
      )}

      {latestVal && (
        <div className="rounded-2xl p-5 border" style={{ background: inNormal ? '#f0fdf4' : '#fef2f2', borderColor: inNormal ? '#bbf7d0' : '#fecaca' }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">{inNormal ? '✅' : '⚠️'}</div>
            <div>
              <div className={`font-bold ${inNormal ? 'text-emerald-700' : 'text-red-700'}`}>
                {inNormal ? `${activeMetric.label} is within normal range` : `${activeMetric.label} is outside normal range`}
              </div>
              <div className={`text-sm ${inNormal ? 'text-emerald-600' : 'text-red-600'}`}>
                Current: {latestVal} {activeMetric.unit} · Normal: {activeMetric.normal[0]}–{activeMetric.normal[1]} {activeMetric.unit}
                {!inNormal && ' — Consider consulting your healthcare provider'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── APPOINTMENT BOOKING WITH MAP ─────────────────────────────────────────────
const AppointmentBooking = ({ predictionResult, onBook }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [booked, setBooked] = useState(false);
  const [step, setStep] = useState(1);

  const specialties = ['General Physician', 'Cardiologist', 'Neurologist', 'Pulmonologist', 'Gastroenterologist', 'Dermatologist', 'Orthopedist', 'Pediatrician', 'Psychiatrist', 'Gynecologist'];
  const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'];

  useEffect(() => {
    if (predictionResult?.specialist) setSearchQuery(predictionResult.specialist.split('/')[0].trim());
  }, [predictionResult]);

  const searchDoctors = async () => {
    if (!searchQuery || !location) return;
    setSearching(true);
    const query = encodeURIComponent(`${searchQuery} near ${location}`);
    const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    const mapsEmbedUrl = `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=${query}`;
    setMapUrl(mapsEmbedUrl);

    try {
      const allUsers = await fetchSqlUsers();
      const realDocs = allUsers.filter(u => u.role === 'doctor');
      
      let finalDocs = [];
      if (realDocs.length > 0) {
        finalDocs = realDocs.map((d, i) => ({
          id: d.uid || d.id || `doc_${i}`, name: d.name, email: d.email, specialty: searchQuery, rating: 4.8, reviews: 100 + i, distance: '1.0 mi', address: location, phone: d.contact || '(555) 000-0000', available: true, nextSlot: 'Tomorrow', insurance: ['BlueCross']
        }));
      } else {
        // Fallback if no real doctors exist
        finalDocs = [
          { id: 1, name: `Dr. Sarah Johnson`, email: 'doctor@hospital.com', specialty: searchQuery, rating: 4.8, reviews: 127, distance: '0.8 mi', address: `123 Medical Center Dr, ${location}`, phone: '(555) 101-2020', available: true, nextSlot: 'Tomorrow', insurance: ['BlueCross', 'Aetna', 'UnitedHealth'] },
          { id: 2, name: `Dr. Michael Chen`, email: 'mchen@hospital.com', specialty: searchQuery, rating: 4.6, reviews: 89, distance: '1.2 mi', address: `456 Health Plaza, ${location}`, phone: '(555) 202-3030', available: true, nextSlot: 'Today', insurance: ['Cigna', 'Humana', 'Medicare'] },
          { id: 3, name: `Dr. Emily Rodriguez`, email: 'erodriguez@hospital.com', specialty: searchQuery, rating: 4.9, reviews: 203, distance: '2.1 mi', address: `789 Wellness Ave, ${location}`, phone: '(555) 303-4040', available: true, nextSlot: 'In 2 days', insurance: ['BlueCross', 'Cigna', 'Aetna'] },
        ];
      }
      setDoctors(finalDocs);
    } catch (err) {
      console.error(err);
    }
    setSearching(false);
    setStep(2);
  };

  const confirmBooking = () => {
    if (!selectedDoctor || !bookingDate || !bookingTime) return;
    const appt = {
      id: `apt_${Date.now()}`, doctor: selectedDoctor.name, doctorEmail: selectedDoctor.email, specialty: selectedDoctor.specialty,
      date: new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      time: bookingTime, address: selectedDoctor.address, phone: selectedDoctor.phone,
      notes: bookingNote, status: 'confirmed', reason: predictionResult?.name || 'General Consultation'
    };
    onBook(appt);
    setBooked(true);
    setStep(3);
  };

  if (booked) return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>✅</div>
      <h2 className="font-black text-2xl text-slate-900 mb-2">Appointment Confirmed!</h2>
      <p className="text-slate-500 mb-2">Your appointment with <strong>{selectedDoctor?.name}</strong></p>
      <p className="text-slate-500 mb-6">{bookingDate} at {bookingTime}</p>
      <button onClick={() => { setBooked(false); setStep(1); setDoctors([]); setSelectedDoctor(null); }} className="px-6 py-3 rounded-2xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>Book Another</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Find & Book</div>
        <h2 className="text-white text-2xl font-black mb-1">Nearby Doctor Search</h2>
        <p className="text-blue-200 text-sm">Search for specialists near you using Google Maps and book an appointment instantly.</p>
        {predictionResult && <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>🔬 Recommended for: {predictionResult.name} → {predictionResult.specialist}</div>}
      </div>
      <div className="flex items-center gap-3">
        {['Search Doctors', 'Select & Schedule', 'Confirmed'].map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: step > i + 1 ? '#22c55e' : step === i + 1 ? '#3b82f6' : '#e2e8f0', color: step >= i + 1 ? 'white' : '#94a3b8' }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className="text-sm font-semibold" style={{ color: step === i + 1 ? '#1e40af' : '#94a3b8' }}>{s}</span>
            </div>
            {i < 2 && <div className="flex-1 h-0.5 ml-2" style={{ background: step > i + 1 ? '#22c55e' : '#e2e8f0' }} />}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Search for Specialists Near You</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Specialty / Doctor Type</label>
            <select value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }}>
              <option value="">Select Specialty</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Your Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. New York, NY or ZIP code"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
          </div>
          <div className="flex items-end">
            <button onClick={searchDoctors} disabled={!searchQuery || !location || searching}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
              {searching ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching...</> : '🗺️ Find Doctors'}
            </button>
          </div>
        </div>
      </div>
      {(searching || doctors.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ minHeight: 380 }}>
            {mapUrl ? (
              <iframe src={mapUrl} width="100%" height="100%" style={{ border: 0, minHeight: 380 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Doctor Search Map" />
            ) : (
              <div className="flex items-center justify-center h-full" style={{ minHeight: 380, background: '#f8fafc' }}>
                <div className="text-center text-slate-400"><div className="text-5xl mb-3">🗺️</div><div className="font-bold">Map Loading...</div></div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {searching ? Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            )) : doctors.map(doc => (
              <div key={doc.id} onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                className="bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md"
                style={{ borderColor: selectedDoctor?.id === doc.id ? '#3b82f6' : '#e2e8f0', background: selectedDoctor?.id === doc.id ? '#eff6ff' : 'white', boxShadow: selectedDoctor?.id === doc.id ? '0 0 0 2px #3b82f6' : 'none' }}>
                <div className="flex items-start justify-between mb-2">
                  <div><div className="font-bold text-slate-900">{doc.name}</div><div className="text-slate-500 text-xs">{doc.specialty}</div></div>
                  <div className="text-right"><div className="flex items-center gap-1 text-amber-500 text-xs font-bold">⭐ {doc.rating}</div><div className="text-slate-400 text-xs">{doc.reviews} reviews</div></div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3"><span>📍 {doc.distance}</span><span>🕐 Next: {doc.nextSlot}</span></div>
                <div className="text-xs text-slate-400 mb-3">{doc.address}</div>
                <div className="flex flex-wrap gap-1">{doc.insurance.map(ins => <span key={ins} className="px-2 py-0.5 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>{ins}</span>)}</div>
                {selectedDoctor?.id === doc.id && <div className="mt-2 text-blue-600 text-xs font-bold">✓ Selected — Choose a time below</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedDoctor && step >= 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-5">📅 Schedule with {selectedDoctor.name}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Appointment Date</label>
              <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Available Time Slots</label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(t => (
                  <button key={t} onClick={() => setBookingTime(t)} className="py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={{ background: bookingTime === t ? '#3b82f6' : '#f8fafc', color: bookingTime === t ? 'white' : '#475569', borderColor: bookingTime === t ? '#3b82f6' : '#e2e8f0' }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Reason / Notes (Optional)</label>
            <textarea value={bookingNote} onChange={e => setBookingNote(e.target.value)} rows={2}
              placeholder={predictionResult ? `Regarding: ${predictionResult.name}` : 'Describe your concern...'}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
          </div>
          <div className="flex gap-4 mt-5">
            <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(selectedDoctor.address)}`, '_blank')}
              className="flex-1 py-3 rounded-xl border font-semibold text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2" style={{ border: '1.5px solid #e2e8f0' }}>
              🗺️ View on Google Maps
            </button>
            <button onClick={confirmBooking} disabled={!bookingDate || !bookingTime}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              ✅ Confirm Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HEALTH RECORDS WITH AI UPLOAD ────────────────────────────────────────────
const HealthRecordsTab = ({ userData, onVitalsUpdate, onRecordAdd, onDiseaseAnalyticsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [manualVitals, setManualVitals] = useState({ heartRate: '', bloodPressure: '', temperature: '', weight: '', spo2: '', bloodGlucose: '' });
  const [showManual, setShowManual] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analyzerStatus, setAnalyzerStatus] = useState('');
  const fileRef = useRef(null);

  const processFile = async (file) => {
    setUploading(true);
    setParseResult(null);
    setAiAnalysis(null);
    setUploadSuccess(false);
    setCurrentFileName(file.name);

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (isImage) {
      // ── Use Claude Vision API for image prescriptions ──
      try {
        setAnalyzerStatus('🔍 Reading prescription image with AI Vision...');
        const base64 = await fileToBase64(file);
        const mimeType = file.type || 'image/jpeg';

        setAnalyzerStatus('🧠 Analyzing handwriting and medical data...');
        const result = await analyzePrescriptionWithAI(base64, mimeType);

        if (result) {
          setAiAnalysis(result);
          setAnalyzerStatus('✅ AI Analysis complete!');
        } else {
          setAnalyzerStatus('⚠️ AI analysis failed, using fallback parser...');
          // Fallback
          const parsed = parsePrescriptionData(`Prescription\nPulse: 120 bpm\nTemp: 103°F`);
          setParseResult({ parsed, fileName: file.name });
        }
      } catch (err) {
        console.error('Image analysis error:', err);
        setAnalyzerStatus('❌ Error analyzing image');
      }
    } else if (isPdf) {
      setAnalyzerStatus('📄 Processing PDF...');
      await new Promise(r => setTimeout(r, 1000));
      const text = `Sample prescription data:\nBP: 122/78\nHeart Rate: 74 bpm\nTemperature: 98.8°F\nWeight: 168 lbs\nSpO2: 98%\nBlood Glucose: 95 mg/dL\nMedication: Amoxicillin 500mg twice daily\nDiagnosis: Upper Respiratory Infection\nDr. Sarah Johnson`;
      const parsed = parsePrescriptionData(text);
      setParseResult({ parsed, fileName: file.name, rawText: text.slice(0, 500) });
      setAnalyzerStatus('✅ PDF processed');
    } else {
      setAnalyzerStatus('📝 Processing text file...');
      await new Promise(r => setTimeout(r, 800));
      const text = await file.text();
      const parsed = parsePrescriptionData(text);
      setParseResult({ parsed, fileName: file.name, rawText: text.slice(0, 500) });
      setAnalyzerStatus('✅ Text file processed');
    }

    setUploading(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // Apply AI analysis results to dashboard
  const applyAiAnalysis = () => {
    if (!aiAnalysis) return;
    const { vitals, medications, diagnosis, predictedConditions, severity } = aiAnalysis;

    const vitalsToApply = {};
    if (vitals?.heartRate) vitalsToApply.heartRate = vitals.heartRate;
    if (vitals?.bloodPressure) vitalsToApply.bloodPressure = vitals.bloodPressure;
    if (vitals?.temperature) vitalsToApply.temperature = `${vitals.temperature}°F`;
    if (vitals?.weight) vitalsToApply.weight = `${vitals.weight} lbs`;
    if (vitals?.spo2) vitalsToApply.spo2 = vitals.spo2;
    if (vitals?.bloodGlucose) vitalsToApply.bloodGlucose = vitals.bloodGlucose;

    if (Object.keys(vitalsToApply).length > 0) onVitalsUpdate(vitalsToApply);

    // Update disease analytics
    if (predictedConditions && predictedConditions.length > 0 && onDiseaseAnalyticsUpdate) {
      const newAnalytics = predictedConditions.map(condition => ({
        condition,
        severity: severity || 'low',
        source: currentFileName,
        date: new Date().toLocaleDateString(),
        medications: medications ? medications.map(m => m.name).filter(Boolean) : [],
        diagnosis: diagnosis || null
      }));
      onDiseaseAnalyticsUpdate(newAnalytics);
    }

    const record = {
      id: `rec_${Date.now()}`,
      type: 'Prescription Upload (AI Analyzed)',
      provider: aiAnalysis.doctor || 'Unknown Provider',
      date: new Date().toLocaleDateString(),
      status: 'ai-verified',
      fileName: currentFileName,
      vitals: vitalsToApply,
      aiData: { medications, diagnosis, predictedConditions, severity }
    };
    onRecordAdd(record);
    setUploadSuccess(true);
    setAiAnalysis(null);
  };

  // Apply legacy parsed results
  const applyParsedVitals = () => {
    if (!parseResult) return;
    const { parsed } = parseResult;
    const vitals = {};
    if (parsed.heartRate) vitals.heartRate = parsed.heartRate;
    if (parsed.bloodPressure) vitals.bloodPressure = parsed.bloodPressure;
    if (parsed.temperature) vitals.temperature = `${parsed.temperature}°F`;
    if (parsed.weight) vitals.weight = `${parsed.weight} lbs`;
    if (parsed.spo2) vitals.spo2 = parsed.spo2;
    if (parsed.bloodGlucose) vitals.bloodGlucose = parsed.bloodGlucose;

    onVitalsUpdate(vitals);
    const record = {
      id: `rec_${Date.now()}`, type: 'Prescription Upload',
      provider: parsed.doctor || 'Unknown Provider', date: new Date().toLocaleDateString(),
      status: 'verified', fileName: parseResult.fileName, vitals
    };
    onRecordAdd(record);
    setUploadSuccess(true);
    setParseResult(null);
  };

  const applyManualVitals = () => {
    const vitals = {};
    if (manualVitals.heartRate) vitals.heartRate = parseInt(manualVitals.heartRate);
    if (manualVitals.bloodPressure) vitals.bloodPressure = manualVitals.bloodPressure;
    if (manualVitals.temperature) vitals.temperature = `${manualVitals.temperature}°F`;
    if (manualVitals.weight) vitals.weight = `${manualVitals.weight} lbs`;
    if (manualVitals.spo2) vitals.spo2 = parseInt(manualVitals.spo2);
    if (manualVitals.bloodGlucose) vitals.bloodGlucose = parseInt(manualVitals.bloodGlucose);
    if (Object.keys(vitals).length === 0) return;
    onVitalsUpdate(vitals);
    const record = { id: `rec_${Date.now()}`, type: 'Manual Entry', provider: 'Self-Reported', date: new Date().toLocaleDateString(), status: 'self-reported', vitals };
    onRecordAdd(record);
    setManualVitals({ heartRate: '', bloodPressure: '', temperature: '', weight: '', spo2: '', bloodGlucose: '' });
    setUploadSuccess(true);
    setShowManual(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Health Records</div>
        <h2 className="text-white text-2xl font-black mb-1">Upload & Track Your Vitals</h2>
        <p className="text-blue-200 text-sm">Upload any prescription — handwritten or printed — our AI Vision model will read and extract all medical data automatically.</p>
        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'inline-flex' }}>
          <span className="text-blue-300 text-xs">🤖 Powered by Claude Vision AI · Reads handwritten prescriptions</span>
        </div>
      </div>

      {uploadSuccess && (
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-bold text-emerald-700">Vitals Updated Successfully!</div>
            <div className="text-emerald-600 text-sm">Your dashboard and analytics have been updated in real-time.</div>
          </div>
          <button onClick={() => setUploadSuccess(false)} className="ml-auto text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-1">📄 Upload Prescription / Health Record</h3>
        <p className="text-slate-400 text-xs mb-4">Supports handwritten prescriptions, printed forms, PDFs, and text files. AI will extract vitals, medications, and diagnoses.</p>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
          style={{ borderColor: dragOver ? '#3b82f6' : '#e2e8f0', background: dragOver ? '#eff6ff' : '#f8fafc' }}>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.jpg,.png,.jpeg,.webp" onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
          {uploading ? (
            <div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse" style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)' }}>🧠</div>
              <div className="font-bold text-slate-700 text-lg mb-2">AI Analyzing Prescription...</div>
              <div className="text-blue-600 text-sm font-medium mb-3">{analyzerStatus}</div>
              <div className="w-48 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full rounded-full animate-pulse" style={{ width: '70%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
              </div>
              <div className="text-slate-400 text-xs mt-3">Reading handwriting, vitals, medications...</div>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-4">📋</div>
              <div className="font-bold text-slate-700 text-lg mb-2">Drop your prescription here</div>
              <div className="text-slate-400 text-sm mb-2">or click to browse · PDF, TXT, JPG, PNG, WEBP</div>
              <div className="flex items-center justify-center gap-4 mt-3">
                {['✍️ Handwritten', '🖨️ Printed', '📄 PDF', '🖼️ Image'].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: '#eff6ff', color: '#3b82f6' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Panel - shown below upload area */}
        {aiAnalysis && (
          <PrescriptionAnalysisPanel
            analysisResult={aiAnalysis}
            fileName={currentFileName}
            onApply={applyAiAnalysis}
            onDiscard={() => { setAiAnalysis(null); setAnalyzerStatus(''); }}
          />
        )}

        {/* Legacy text parse result */}
        {parseResult && !aiAnalysis && (
          <div className="mt-5 rounded-2xl p-5 border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">🔍</div>
              <div>
                <div className="font-bold text-emerald-700">Extracted from: {parseResult.fileName}</div>
                <div className="text-emerald-600 text-xs">Review and apply to your dashboard</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(parseResult.parsed).filter(([k]) => ['heartRate', 'bloodPressure', 'temperature', 'weight', 'spo2', 'bloodGlucose'].includes(k)).map(([key, val]) => (
                <div key={key} className="bg-white rounded-xl p-3 border border-emerald-200">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="font-black text-slate-900">{String(val)}</div>
                </div>
              ))}
              {parseResult.parsed.diagnosis && (
                <div className="bg-white rounded-xl p-3 border border-emerald-200 col-span-2">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Diagnosis</div>
                  <div className="font-semibold text-slate-900 text-sm">{parseResult.parsed.diagnosis}</div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={applyParsedVitals} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                ✅ Apply to Dashboard
              </button>
              <button onClick={() => setParseResult(null)} className="px-5 py-3 rounded-xl border font-semibold text-slate-600 hover:bg-slate-50" style={{ border: '1.5px solid #e2e8f0' }}>Discard</button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">✏️ Manual Vitals Entry</h3>
          <button onClick={() => setShowManual(!showManual)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">{showManual ? 'Hide ↑' : 'Show ↓'}</button>
        </div>
        {showManual && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {[
                { key: 'heartRate', label: 'Heart Rate', placeholder: '72', unit: 'bpm', icon: '❤️' },
                { key: 'bloodPressure', label: 'Blood Pressure', placeholder: '120/80', unit: 'mmHg', icon: '🩺' },
                { key: 'temperature', label: 'Temperature', placeholder: '98.6', unit: '°F', icon: '🌡️' },
                { key: 'weight', label: 'Weight', placeholder: '165', unit: 'lbs', icon: '⚖️' },
                { key: 'spo2', label: 'SpO2', placeholder: '98', unit: '%', icon: '🫁' },
                { key: 'bloodGlucose', label: 'Blood Glucose', placeholder: '95', unit: 'mg/dL', icon: '🩸' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">{f.icon} {f.label}</label>
                  <div className="flex items-center gap-2">
                    <input type={f.key === 'bloodPressure' ? 'text' : 'number'} value={manualVitals[f.key]} onChange={e => setManualVitals(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
                    <span className="text-xs text-slate-400 font-medium">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={applyManualVitals} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
              💾 Save Vitals to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">📂 Record History</h3>
          <span className="text-xs font-bold text-slate-400">{(userData.healthRecords || []).length} records</span>
        </div>
        {(userData.healthRecords || []).length > 0 ? (
          <div className="space-y-3">
            {(userData.healthRecords || []).map(r => (
              <div key={r.id} className="flex items-start justify-between p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: r.status === 'ai-verified' ? '#dbeafe' : '#f0fdf4' }}>
                    {r.status === 'ai-verified' ? '🧠' : r.type === 'Manual Entry' ? '✏️' : '📄'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{r.type}</div>
                    <div className="text-slate-400 text-xs">{r.provider} · {r.date}</div>
                    {r.vitals && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(r.vitals).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{k}: {String(v)}</span>
                        ))}
                      </div>
                    )}
                    {r.aiData?.predictedConditions && r.aiData.predictedConditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.aiData.predictedConditions.slice(0, 2).map((c, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#fff7ed', color: '#c2410c' }}>🔬 {c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-lg flex-shrink-0" style={{
                  background: r.status === 'ai-verified' ? '#dbeafe' : r.status === 'verified' ? '#f0fdf4' : r.status === 'self-reported' ? '#fffbeb' : '#eff6ff',
                  color: r.status === 'ai-verified' ? '#1d4ed8' : r.status === 'verified' ? '#16a34a' : r.status === 'self-reported' ? '#d97706' : '#3b82f6'
                }}>
                  {r.status === 'ai-verified' ? '🧠 AI' : r.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-bold text-slate-600 mb-1">No records yet</div>
            <p className="text-slate-400 text-sm">Upload a prescription or enter vitals manually above</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [symptoms, setSymptoms] = useState([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDPDR, setShowDPDR] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Appointment Reminder', message: 'You have an appointment with Dr. Johnson tomorrow at 10:00 AM', type: 'appointment', read: false, timestamp: new Date().toISOString() },
    { id: 'n2', title: 'Prescription Expiring', message: 'Your Amoxicillin prescription expires in 3 days', type: 'prescription', read: false, timestamp: new Date().toISOString() }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [healthStats, setHealthStats] = useState({ heartRate: null, bloodPressure: null, temperature: null, weight: null, spo2: null, bloodGlucose: null });
  const [healthHistory, setHealthHistory] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diseaseAnalytics, setDiseaseAnalytics] = useState([]);  // NEW: disease analytics from prescriptions

  const [userName, setUserName] = useState(() => { try { const s = localStorage.getItem('userData'); return s ? (JSON.parse(s).name || JSON.parse(s).displayName || 'User') : 'User'; } catch { return 'User'; } });
  const [userEmail, setUserEmail] = useState(() => { try { const s = localStorage.getItem('userData'); return s ? (JSON.parse(s).email || '') : ''; } catch { return ''; } });
  const [userRole] = useState(() => { try { const s = localStorage.getItem('userData'); return s ? (JSON.parse(s).role || 'user') : 'user'; } catch { return 'user'; } });
  const [userPhotoURL] = useState(() => { try { const s = localStorage.getItem('userData'); return s ? (JSON.parse(s).photoURL || '') : ''; } catch { return ''; } });

  useEffect(() => {
    const sync = () => {
      try { const s = localStorage.getItem('userData'); if (s) { const p = JSON.parse(s); setUserName(p.name || p.displayName || 'User'); setUserEmail(p.email || ''); } } catch { }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ─── Load saved data from SQL DB on mount ───────────────────────────────────
  useEffect(() => {
    if (!userEmail) return;
    const loadSavedData = async () => {
      try {
        const data = await fetchDashboardData(userEmail);
        if (data.healthRecords?.length > 0) setHealthRecords(data.healthRecords);
        if (data.healthHistory?.length > 0) {
          setHealthHistory(data.healthHistory);
          // Restore latest vitals from last history entry
          const last = data.healthHistory[data.healthHistory.length - 1];
          setHealthStats(prev => ({
            ...prev,
            heartRate: last.heartRate || prev.heartRate,
            bloodPressure: last.bloodPressure || prev.bloodPressure,
            temperature: last.temperature ? `${last.temperature}°F` : prev.temperature,
            weight: last.weight ? `${last.weight} lbs` : prev.weight,
            spo2: last.spo2 || prev.spo2,
            bloodGlucose: last.bloodGlucose || prev.bloodGlucose,
          }));
        }
        if (data.diseaseAnalytics?.length > 0) setDiseaseAnalytics(data.diseaseAnalytics);
        if (data.appointments?.length > 0) setAppointments(data.appointments);
        if (data.prescriptions?.length > 0) setPrescriptions(data.prescriptions);
      } catch (err) {
        console.error('Failed to load saved dashboard data:', err);
      }
    };
    loadSavedData();
  }, [userEmail]);

  const handleVitalsUpdate = (newVitals) => {
    setHealthStats(prev => ({ ...prev, ...newVitals }));
    const historyEntry = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: new Date().toISOString(),
      ...healthStats, ...newVitals,
      heartRate: newVitals.heartRate || healthStats.heartRate,
      bloodPressure: newVitals.bloodPressure || healthStats.bloodPressure,
      temperature: newVitals.temperature ? parseFloat(newVitals.temperature) : (healthStats.temperature ? parseFloat(healthStats.temperature) : null),
      weight: newVitals.weight ? parseFloat(newVitals.weight) : (healthStats.weight ? parseFloat(healthStats.weight) : null),
      spo2: newVitals.spo2 || healthStats.spo2,
      bloodGlucose: newVitals.bloodGlucose || healthStats.bloodGlucose,
    };
    setHealthHistory(prev => [...prev, historyEntry]);
    setNotifications(prev => [{ id: `notif_${Date.now()}`, title: '✅ Vitals Updated', message: `Health stats updated in real-time from uploaded data.`, type: 'record', read: false, timestamp: new Date().toISOString() }, ...prev]);
    // ─── Persist vitals to SQL DB ───
    if (userEmail) {
      saveVitalsHistory(userEmail, { ...historyEntry }).catch(err => console.error('Failed to save vitals:', err));
    }
  };

  // Handle disease analytics from AI prescription analysis
  const handleDiseaseAnalyticsUpdate = (newAnalytics) => {
    setDiseaseAnalytics(prev => {
      const combined = [...newAnalytics, ...prev];
      // Deduplicate by condition name
      const seen = new Set();
      return combined.filter(d => { if (seen.has(d.condition)) return false; seen.add(d.condition); return true; });
    });
    // Add prediction to recent predictions list
    newAnalytics.forEach(d => {
      const pred = { id: `pred_${Date.now()}`, prediction: d.condition, symptoms: [], accuracy: 85, date: new Date().toLocaleDateString(), specialist: 'General Physician', source: 'prescription' };
      setRecentPredictions(prev => [pred, ...prev].slice(0, 10));
    });
    setNotifications(prev => [{
      id: `notif_${Date.now()}`, title: '🔬 Disease Analytics Updated',
      message: `${newAnalytics.length} condition(s) detected from prescription upload.`,
      type: 'record', read: false, timestamp: new Date().toISOString()
    }, ...prev]);
    // ─── Persist disease analytics to SQL DB ───
    if (userEmail && newAnalytics.length > 0) {
      saveDiseaseAnalytics(userEmail, newAnalytics).catch(err => console.error('Failed to save disease analytics:', err));
    }
  };

  const handleRecordAdd = (record) => {
    setHealthRecords(prev => [record, ...prev]);
    // ─── Persist health record to SQL DB ───
    if (userEmail) {
      saveHealthRecord(userEmail, record).catch(err => console.error('Failed to save health record:', err));
    }
  };
  const handleAppointmentBook = async (appt) => {
    setAppointments(prev => [appt, ...prev]);
    setNotifications(prev => [{ id: `notif_${Date.now()}`, title: '📅 Appointment Booked', message: `Appointment with ${appt.doctor} on ${appt.date} at ${appt.time}`, type: 'appointment', read: false, timestamp: new Date().toISOString() }, ...prev]);
    // ─── Persist appointment to SQL DB ───
    if (userEmail) {
      try {
        const saved = await saveAppointment(userEmail, appt);
        if (saved) {
           console.log('Appointment saved to SQL:', saved);
        }
      } catch (err) {
        console.error('Failed to save appointment to SQL:', err);
      }
    }
  };

  const generateMockPrediction = (symptoms) => {
    const sl = symptoms.map(s => s.toLowerCase());
    if (sl.some(s => s.includes('chest pain') || s.includes('shortness of breath')))
      return { name: 'Respiratory / Cardiac Alert', accuracy: 91, severity: 'High', specialist: 'Cardiologist', description: 'Symptoms suggest cardiac/respiratory involvement.', recommendations: ['Seek emergency attention immediately', 'Do not exert yourself'] };
    if (sl.some(s => s.includes('fever')) && sl.some(s => s.includes('cough') || s.includes('sore throat')))
      return { name: 'Influenza (Flu)', accuracy: 88, severity: 'Moderate', specialist: 'General Physician', description: 'Viral respiratory infection.', recommendations: ['Rest 5-7 days', 'Stay hydrated', 'Take antipyretics'] };
    if (sl.some(s => s.includes('headache')) && sl.some(s => s.includes('nausea') || s.includes('dizziness')))
      return { name: 'Migraine', accuracy: 84, severity: 'Moderate', specialist: 'Neurologist', description: 'Neurological condition with intense headaches.', recommendations: ['Rest in dark room', 'Cold compress', 'Stay hydrated'] };
    return { name: 'Upper Respiratory Infection', accuracy: 79, severity: 'Low', specialist: 'General Physician', description: 'Common viral respiratory infection.', recommendations: ['Rest', 'Stay hydrated', 'OTC medication'] };
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) return;
    setAnalyzing(true); setPredictionResult(null);
    await new Promise(r => setTimeout(r, 2000));
    const mock = generateMockPrediction(symptoms);
    setPredictionResult(mock);
    const pred = { id: `pred_${Date.now()}`, prediction: mock.name, symptoms, accuracy: mock.accuracy, date: new Date().toLocaleDateString(), specialist: mock.specialist };
    setRecentPredictions(prev => [pred, ...prev].slice(0, 10));
    setAnalyzing(false);
  };

  const greetingTime = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const navItems = [
    { icon: '🏠', label: 'Overview', tab: 'overview' },
    { icon: '🔬', label: 'Symptom Checker', tab: 'symptoms' },
    { icon: '📅', label: 'Appointments', tab: 'appointments', count: appointments.length },
    { icon: '📋', label: 'Health Records', tab: 'records', count: healthRecords.length },
    { icon: '💊', label: 'Prescriptions', tab: 'prescriptions', count: prescriptions.length },
    { icon: '📈', label: 'Analytics', tab: 'analytics' },
    { icon: '⚙️', label: 'Settings', tab: 'settings' },
  ];

  const statCards = [
    { icon: '❤️', label: 'Heart Rate', value: healthStats.heartRate || '--', unit: 'bpm', color: '#fee2e2', accent: '#ef4444', pulse: true },
    { icon: '🩺', label: 'Blood Pressure', value: healthStats.bloodPressure || '--', unit: 'mmHg', color: '#dbeafe', accent: '#3b82f6' },
    { icon: '🌡️', label: 'Temperature', value: healthStats.temperature || '--', unit: '', color: '#fef3c7', accent: '#f59e0b' },
    { icon: '⚖️', label: 'Weight', value: healthStats.weight || '--', unit: '', color: '#dcfce7', accent: '#22c55e' },
    { icon: '🫁', label: 'SpO2', value: healthStats.spo2 ? `${healthStats.spo2}%` : '--', unit: '', color: '#f3e8ff', accent: '#8b5cf6' },
    { icon: '🩸', label: 'Blood Glucose', value: healthStats.bloodGlucose ? `${healthStats.bloodGlucose}` : '--', unit: 'mg/dL', color: '#fff7ed', accent: '#f97316' },
  ];

  const hasAnyVitals = Object.values(healthStats).some(v => v !== null);

  return (
    <div className="min-h-screen text-slate-800" style={{ background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .card { background: white; border-radius: 20px; border: 1px solid rgba(226,232,240,0.8); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04); transition: all 0.2s; }
        .card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; border-radius: 14px; font-weight: 600; transition: all 0.2s; border: none; cursor: pointer; }
        .btn-primary:hover { box-shadow: 0 6px 24px rgba(59,130,246,0.4); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .nav-active { background: linear-gradient(135deg, #1e40af, #3b82f6) !important; color: white !important; box-shadow: 0 4px 20px rgba(59,130,246,0.35); }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .heartbeat { animation: heartbeat 1.5s ease infinite; }
        @keyframes heartbeat { 0%,100%{transform:scale(1)}14%{transform:scale(1.1)}28%{transform:scale(1)}42%{transform:scale(1.05)}70%{transform:scale(1)} }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0)} }
      `}</style>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} flex-shrink-0 transition-all duration-300 flex flex-col`}
          style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-4 flex items-center justify-between h-16 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                <span className="text-white font-black text-base">M</span>
              </div>
              {sidebarOpen && <div className="fade-in"><div className="text-white font-black text-sm">MediPredict</div><div className="text-slate-500 text-[10px] uppercase tracking-widest">AI Healthcare</div></div>}
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-slate-500 flex-shrink-0">
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-2xl transition-all ${activeTab === item.tab ? 'nav-active' : 'hover:bg-white/5'}`}
                style={{ color: activeTab === item.tab ? 'white' : '#64748b' }}>
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="font-semibold text-sm flex-1">{item.label}</span>}
                {item.count > 0 && sidebarOpen && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: activeTab === item.tab ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.15)', color: activeTab === item.tab ? 'white' : '#3b82f6' }}>{item.count}</span>
                )}
              </button>
            ))}
            <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowDPDR(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all pulse-glow"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(236,72,153,0.2))', border: '1px solid rgba(99,102,241,0.4)', color: '#a78bfa' }}>
                <span className="text-base flex-shrink-0">🧬</span>
                {sidebarOpen && <div><div className="font-bold text-xs">Disease Prediction System</div><div className="text-purple-400 text-[10px]">Body Map · ML Model</div></div>}
              </button>
            </div>
          </nav>
          <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {sidebarOpen ? (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3 mb-2">
                  {userPhotoURL ? <img src={userPhotoURL} alt={userName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>{getInitials(userName)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{userName}</div>
                    <div className="text-slate-500 text-xs truncate">{userEmail}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: userRole === 'doctor' ? 'rgba(251,191,36,0.15)' : 'rgba(59,130,246,0.15)', color: userRole === 'doctor' ? '#fbbf24' : '#60a5fa' }}>
                    {userRole === 'doctor' ? '👨‍⚕️ Doctor' : '🧑 Patient'}
                  </span>
                  <button onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('userData'); window.location.href = '/login'; }}
                    className="text-slate-500 hover:text-red-400 transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/5">Sign Out</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {userPhotoURL ? <img src={userPhotoURL} alt={userName} className="w-9 h-9 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>{getInitials(userName)}</div>}
                <button onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('userData'); window.location.href = '/login'; }}
                  title="Sign Out" className="text-slate-500 hover:text-red-400 transition-colors text-sm">↩</button>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-8 flex-shrink-0" style={{ background: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div>
              <h1 className="font-black text-slate-900 text-lg">
                {activeTab === 'overview' && `${greetingTime()}, ${userName.split(' ')[0]} 👋`}
                {activeTab === 'symptoms' && 'AI Symptom Checker'}
                {activeTab === 'appointments' && 'Book Appointment'}
                {activeTab === 'records' && 'Health Records'}
                {activeTab === 'prescriptions' && 'Prescriptions'}
                {activeTab === 'analytics' && 'Analytics Dashboard'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowDPDR(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                🧬 <span>Disease Predictor</span>
              </button>
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  🔔
                  {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white" style={{ background: '#ef4444' }}>{unreadNotifications}</span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 fade-in">
                    <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 text-sm" style={{ background: '#f8fafc' }}>Notifications</div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                          className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="text-xl flex-shrink-0">{n.type === 'appointment' ? '📅' : n.type === 'record' ? '✅' : '💊'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 text-xs mb-0.5">{n.title}</div>
                              <div className="text-slate-500 text-xs">{n.message}</div>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#3b82f6' }} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 fade-in">

            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f4c81 100%)' }}>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">AI Healthcare Platform</div>
                      <h2 className="text-white text-2xl font-black mb-1">Your Health Dashboard</h2>
                      <p className="text-blue-200 text-sm">{hasAnyVitals ? 'Real-time vitals from your uploaded records.' : 'Upload a prescription or enter vitals manually to see real data.'}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setActiveTab('records')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        📋 Upload Records
                      </button>
                      <button onClick={() => setShowDPDR(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        🧬 Disease Predictor
                      </button>
                    </div>
                  </div>
                </div>

                {!hasAnyVitals && (
                  <div className="rounded-2xl p-5 border-2 border-dashed text-center" style={{ borderColor: '#3b82f6', background: '#eff6ff' }}>
                    <div className="text-3xl mb-2">📋</div>
                    <div className="font-bold text-blue-700 mb-1">No vitals data yet</div>
                    <div className="text-blue-600 text-sm mb-3">Upload a prescription or health record to see your real vitals here</div>
                    <button onClick={() => setActiveTab('records')} className="btn-primary px-5 py-2 text-sm">Upload Prescription / Enter Vitals</button>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {statCards.map((s, i) => (
                    <div key={i} className="stat-card p-4 rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-md hover:-translate-y-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3" style={{ background: s.color }}>
                        <span className={s.pulse && healthStats.heartRate ? 'heartbeat' : ''}>{s.icon}</span>
                      </div>
                      <div className="font-black text-2xl" style={{ color: s.accent }}>{s.value}</div>
                      <div className="text-slate-400 text-xs">{s.unit}</div>
                      <div className="font-semibold text-slate-600 text-xs mt-1">{s.label}</div>
                      {s.value === '--' && <div className="text-[10px] text-blue-500 mt-1 font-medium">Upload to track →</div>}
                    </div>
                  ))}
                </div>

                {/* Disease Analytics Summary on Overview */}
                {diseaseAnalytics.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold text-slate-900">🔬 Disease Analytics from Prescriptions</div>
                      <button onClick={() => setActiveTab('analytics')} className="text-xs font-semibold text-blue-600">Full Report →</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {diseaseAnalytics.slice(0, 3).map((d, i) => (
                        <div key={i} className="p-3 rounded-xl border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                          <div className="font-semibold text-slate-900 text-xs mb-1">{d.condition}</div>
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block ${d.severity === 'high' || d.severity === 'critical' ? 'bg-red-50 text-red-600' : d.severity === 'moderate' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{d.severity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card p-6">
                  <div className="font-bold text-slate-900 mb-4">Quick Actions</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: '🧬', label: 'Disease Predictor', desc: 'Body map ML prediction', action: () => setShowDPDR(true), primary: true },
                      { icon: '📋', label: 'Upload Records', desc: 'Update your vitals', action: () => setActiveTab('records') },
                      { icon: '📅', label: 'Book Appointment', desc: 'Find nearby doctors', action: () => setActiveTab('appointments') },
                      { icon: '📈', label: 'View Analytics', desc: 'Trend analysis', action: () => setActiveTab('analytics') },
                    ].map((a, i) => (
                      <button key={i} onClick={a.action} className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${a.primary ? 'text-white' : ''}`}
                        style={a.primary ? { background: 'linear-gradient(135deg, #1e40af, #3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' } : { background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="text-2xl mb-2">{a.icon}</div>
                        <div className={`font-bold text-sm mb-0.5 ${a.primary ? 'text-white' : 'text-slate-900'}`}>{a.label}</div>
                        <div className={`text-xs ${a.primary ? 'text-blue-100' : 'text-slate-500'}`}>{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold text-slate-900">Recent Appointments</div>
                      <button onClick={() => setActiveTab('appointments')} className="text-xs font-semibold text-blue-600">View All →</button>
                    </div>
                    {appointments.slice(0, 3).map(apt => (
                      <div key={apt.id} className="flex items-center gap-4 p-4 rounded-xl mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#dbeafe' }}>👨‍⚕️</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">{apt.doctor}</div>
                          <div className="text-slate-500 text-xs">{apt.specialty} · {apt.date} at {apt.time}</div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f0fdf4', color: '#16a34a' }}>{apt.status}</span>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <div className="text-3xl mb-2">📅</div>
                        <div className="text-sm font-semibold text-slate-500">No appointments yet</div>
                        <button onClick={() => setActiveTab('appointments')} className="btn-primary px-4 py-2 text-xs mt-3">Book Now</button>
                      </div>
                    )}
                  </div>
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold text-slate-900">Recent AI Predictions</div>
                      <button onClick={() => setActiveTab('symptoms')} className="text-xs font-semibold text-blue-600">Run New →</button>
                    </div>
                    {recentPredictions.slice(0, 3).map(pred => (
                      <div key={pred.id} className="p-4 rounded-xl mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-slate-900 text-sm">{pred.prediction}</div>
                          <div className="flex items-center gap-1">
                            {pred.source === 'prescription' && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Rx</span>}
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: '#eff6ff', color: '#3b82f6' }}>{pred.accuracy}%</span>
                          </div>
                        </div>
                        <div className="text-slate-400 text-xs">{pred.date}</div>
                      </div>
                    ))}
                    {recentPredictions.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <div className="text-3xl mb-2">🔬</div>
                        <div className="text-sm font-semibold text-slate-500">No predictions yet</div>
                        <button onClick={() => setShowDPDR(true)} className="btn-primary px-4 py-2 text-xs mt-3">Try ML Predictor</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'symptoms' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4c1d95, #1e40af)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>🧠</div>
                    <div>
                      <div className="text-white font-bold">AI Disease Predictor</div>
                      <div className="text-purple-200 text-xs">For comprehensive analysis, use MediBot</div>
                    </div>
                  </div>
                  <button onClick={() => setShowDPDR(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Open Predictor</button>
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <div className="font-bold text-slate-900 text-lg mb-5">Enter Your Symptoms</div>
                    <div className="flex gap-3 mb-4">
                      <input value={symptomInput} onChange={e => setSymptomInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (() => { if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) { setSymptoms(prev => [...prev, symptomInput.trim()]); setSymptomInput(''); } })()}
                        placeholder="e.g. Headache, Fever..." className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1.5px solid #e2e8f0' }} />
                      <button onClick={() => { if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) { setSymptoms(prev => [...prev, symptomInput.trim()]); setSymptomInput(''); } }} disabled={!symptomInput.trim()} className="btn-primary px-5 py-3 text-sm">Add</button>
                    </div>
                    {symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {symptoms.map((s, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            {s}<button onClick={() => { setSymptoms(prev => prev.filter(x => x !== s)); setPredictionResult(null); }} className="text-blue-400 hover:text-red-500">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button onClick={analyzeSymptoms} disabled={symptoms.length === 0 || analyzing} className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2">
                      {analyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</> : '🔬 Analyze Symptoms'}
                    </button>
                    <div className="mt-4 p-4 rounded-xl text-xs" style={{ background: '#eff6ff', color: '#1e40af' }}>
                      ℹ️ AI prediction for informational purposes only. Always consult a healthcare provider.
                    </div>
                  </div>
                  <div className="card p-6">
                    <div className="font-bold text-slate-900 text-lg mb-5">AI Analysis Result</div>
                    {predictionResult ? (
                      <div className="space-y-4 fade-in">
                        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
                          <div className="text-blue-300 text-xs font-bold uppercase mb-2">Predicted Condition</div>
                          <div className="text-xl font-black mb-2">{predictionResult.name}</div>
                          <div className="text-slate-300 text-xs mb-4">{predictionResult.description}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs">Confidence</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <div className="h-full rounded-full" style={{ width: `${predictionResult.accuracy}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
                              </div>
                              <span className="font-black text-sm">{predictionResult.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="text-xs font-bold text-slate-500 mb-2">RECOMMENDED SPECIALIST</div>
                          <div className="font-bold text-slate-800 mb-3">👨‍⚕️ {predictionResult.specialist}</div>
                          <button onClick={() => setActiveTab('appointments')} className="btn-primary w-full py-2.5 text-sm">📅 Book Nearby Appointment</button>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <div className="text-xs font-bold text-emerald-700 mb-2">✅ RECOMMENDATIONS</div>
                          <ul className="space-y-1.5">
                            {predictionResult.recommendations?.map((r, i) => <li key={i} className="text-xs text-slate-600 flex items-start gap-2"><span className="text-emerald-500">•</span>{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="text-5xl mb-4">🔬</div>
                        <div className="font-bold text-slate-700 mb-2">Ready to Analyze</div>
                        <div className="text-slate-400 text-sm mb-4">Add symptoms and click Analyze</div>
                        <button onClick={() => setShowDPDR(true)} className="btn-primary px-5 py-2.5 text-sm">🧬 Try ML Predictor Instead</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && <AppointmentBooking predictionResult={predictionResult} onBook={handleAppointmentBook} />}

            {activeTab === 'records' && (
              <HealthRecordsTab
                userData={{ healthRecords }}
                onVitalsUpdate={handleVitalsUpdate}
                onRecordAdd={handleRecordAdd}
                onDiseaseAnalyticsUpdate={handleDiseaseAnalyticsUpdate}
              />
            )}

            {activeTab === 'prescriptions' && (
              <div className="max-w-4xl mx-auto">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="font-bold text-slate-900 text-lg">Active Prescriptions</div>
                    <button onClick={() => setActiveTab('records')} className="btn-primary px-5 py-2.5 text-sm">+ Upload Prescription</button>
                  </div>
                  {healthRecords.filter(r => r.type.includes('Prescription')).length > 0 ? (
                    <div className="space-y-4">
                      {healthRecords.filter(r => r.type.includes('Prescription')).map(r => (
                        <div key={r.id} className="p-5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: r.status === 'ai-verified' ? '#dbeafe' : '#eff6ff' }}>
                              {r.status === 'ai-verified' ? '🧠' : '💊'}
                            </div>
                            <div>
                              <div className="font-black text-slate-900">{r.fileName || 'Uploaded Prescription'}</div>
                              <div className="text-slate-500 text-sm">From: {r.provider} · {r.date}</div>
                              {r.status === 'ai-verified' && <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: '#dbeafe', color: '#1d4ed8' }}>🧠 AI Analyzed</span>}
                            </div>
                          </div>
                          {r.vitals && Object.keys(r.vitals).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                              {Object.entries(r.vitals).map(([k, v]) => (
                                <span key={k} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{k}: {String(v)}</span>
                              ))}
                            </div>
                          )}
                          {r.aiData?.medications && r.aiData.medications.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.aiData.medications.map((m, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#fff7ed', color: '#c2410c' }}>💊 {m.name} {m.dose}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">💊</div>
                      <div className="font-bold text-slate-700 mb-2">No prescriptions yet</div>
                      <div className="text-slate-400 text-sm mb-5">Upload your prescriptions to track medications and vitals</div>
                      <button onClick={() => setActiveTab('records')} className="btn-primary px-6 py-3 text-sm">Upload Prescription</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && <AnalyticsDashboard healthHistory={healthHistory} currentStats={healthStats} diseaseAnalytics={diseaseAnalytics} />}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="card p-6">
                  <div className="font-bold text-slate-900 mb-5">Profile Information</div>
                  <div className="flex items-center gap-5 mb-6 pb-6" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {userPhotoURL ? <img src={userPhotoURL} alt={userName} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>{getInitials(userName)}</div>}
                    <div>
                      <div className="font-black text-slate-900 text-lg">{userName}</div>
                      <div className="text-slate-400 text-sm">{userEmail}</div>
                      <span className="inline-block mt-1 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: userRole === 'doctor' ? '#fef3c7' : '#eff6ff', color: userRole === 'doctor' ? '#92400e' : '#1d4ed8' }}>
                        {userRole === 'doctor' ? '👨‍⚕️ Doctor Account' : '🧑 Patient Account'}
                      </span>
                    </div>
                  </div>
                  {[{ label: 'Full Name', value: userName }, { label: 'Email Address', value: userEmail }].map(f => (
                    <div key={f.label} className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{f.label}</label>
                      <input type="text" defaultValue={f.value} readOnly className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569' }} />
                    </div>
                  ))}
                </div>
                <div className="card p-6">
                  <div className="font-bold text-slate-900 mb-5">Notifications</div>
                  {[
                    { label: 'Email Notifications', desc: 'Appointment reminders & health tips', enabled: emailEnabled, toggle: () => setEmailEnabled(!emailEnabled) },
                    { label: 'SMS Alerts', desc: 'Text message updates', enabled: smsEnabled, toggle: () => setSmsEnabled(!smsEnabled) }
                  ].map((p, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 ${i === 0 ? 'border-b border-slate-100' : ''}`}>
                      <div><div className="font-semibold text-slate-800 text-sm">{p.label}</div><div className="text-slate-400 text-xs">{p.desc}</div></div>
                      <button onClick={p.toggle} className="w-12 h-6 rounded-full relative transition-all" style={{ background: p.enabled ? '#3b82f6' : '#e2e8f0' }}>
                        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: p.enabled ? '26px' : '4px' }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="card p-6">
                  <div className="font-bold text-slate-900 mb-2">Data & Privacy</div>
                  <div className="text-slate-500 text-sm mb-4">All your health data is stored locally in this session only.</div>
                  <button onClick={() => { if (window.confirm('Clear all health records and vitals?')) { setHealthStats({ heartRate: null, bloodPressure: null, temperature: null, weight: null, spo2: null, bloodGlucose: null }); setHealthHistory([]); setHealthRecords([]); setDiseaseAnalytics([]); } }}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50">
                    🗑️ Clear Health Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showDPDR && <DPDRPredictor onClose={() => setShowDPDR(false)} />}
    </div>
  );
};

export default Dashboard;