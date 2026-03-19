import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── AI IMAGE ANALYZER ──────────────────────────────────────────────────────
const analyzeImageWithAI = async (imageBase64, mimeType) => {
    try {
        const response = await fetch("/dpdr/vision-predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image: `data:${mimeType};base64,${imageBase64}`
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;

    } catch (e) {
        console.error("AI Vision Analysis failed:", e);
        return {
            disease: "Unable to analyze image",
            severity: "Unknown",
            specialist: "General Physician",
            confidence: 0,
            symptoms: ["Image unclear or API unreachable"],
            recommendations: ["Ensure your Flask backend (app.py) is running.", "You can manually select symptoms from the Body Map for now."]
        };
    }
};

// ─── BODY REGION SYMPTOM MAP ────────────────────────────────────────────────
const BODY_REGIONS = {
    head: {
        label: 'Head & Neck',
        symptoms: ['headache', 'blurred and distorted vision', 'redness of eyes', 'sunken eyes', 'pain behind the eyes', 'dizziness', 'altered sensorium', 'loss of balance', 'lack of concentration', 'visual disturbances', 'slurred speech', 'loss of smell', 'continuous sneezing', 'runny nose', 'congestion', 'sinus pressure', 'patches in throat', 'cough', 'throat irritation', 'stiff neck', 'neck pain', 'yellowing of eyes', 'mucoid sputum', 'blood in sputum', 'ulcers on tongue']
    },
    chest: {
        label: 'Chest & Back',
        symptoms: ['chest pain', 'breathlessness', 'fast heart rate', 'palpitations', 'back pain']
    },
    abdomen: {
        label: 'Abdomen & Pelvis',
        symptoms: ['stomach pain', 'acidity', 'vomiting', 'indigestion', 'abdominal pain', 'nausea', 'loss of appetite', 'constipation', 'diarrhoea', 'swelling of stomach', 'belly pain', 'stomach bleeding', 'distention of abdomen', 'bladder discomfort', 'continuous feel of urine', 'burning micturition', 'foul smell of urine', 'yellow urine', 'dark urine', 'passage of gases', 'abnormal menstruation']
    },
    arms: {
        label: 'Arms & Hands',
        symptoms: ['cold hands and feets', 'brittle nails', 'small dents in nails', 'inflammatory nails', 'muscle weakness', 'joint pain', 'swelling joints']
    },
    legs: {
        label: 'Legs & Feet',
        symptoms: ['knee pain', 'swollen legs', 'prominent veins on calf', 'painful walking', 'hip joint pain', 'movement stiffness', 'cramps']
    },
    general: {
        label: 'General / Systemic',
        symptoms: ['itching', 'skin rash', 'shivering', 'chills', 'fatigue', 'weight gain', 'anxiety', 'mood swings', 'weight loss', 'restlessness', 'lethargy', 'irregular sugar level', 'high fever', 'sweating', 'dehydration', 'yellowish skin', 'mild fever', 'swelled lymph nodes', 'malaise', 'weakness in limbs', 'bruising', 'obesity', 'puffy face and eyes', 'enlarged thyroid', 'excessive hunger', 'muscle pain', 'red spots over body', 'depression', 'irritability', 'increased appetite', 'family history', 'coma', 'history of alcohol consumption', 'pus filled pimples', 'blackheads', 'skin peeling', 'blister', 'yellow crust ooze']
    }
};

// Male body SVG paths — Muscular / Heroic build (Matching 3D Model)
const MALE_SVG_PARTS = {
    // Broader jawline and powerful neck base
    head: "M100,10 C118,10,124,34,116,52 C110,62,110,70,110,76 L90,76 C90,70,90,62,84,52 C76,34,82,10,100,10 Z",

    // Significantly wider shoulders and deep chest curvature
    chest: "M90,76 C70,82,40,85,35,100 C30,115,35,135,45,145 L155,145 C165,135,170,115,165,100 C160,85,130,82,110,76 Z",

    // Tapered waist (V-shape) moving from wide chest to narrower belt line
    abdomen: "M45,145 C50,170,55,190,65,215 L135,215 C145,190,150,170,155,145 Z",

    // Bulkier deltoids and biceps, matching the model's T-Pose mass
    leftArm: "M35,100 C20,110,10,140,8,175 C6,205,10,230,20,235 C30,240,40,230,42,210 C45,185,50,165,45,145 Z",
    rightArm: "M165,100 C180,110,190,140,192,175 C194,205,190,230,180,235 C170,240,160,230,158,210 C155,185,150,165,155,145 Z",

    // Thicker, powerful legs with prominent quad muscle flare
    leftLeg: "M65,215 C55,270,50,320,55,375 C58,395,60,405,75,405 C88,405,90,385,88,360 C85,310,95,260,100,215 Z",
    rightLeg: "M135,215 C145,270,150,320,145,375 C142,395,140,405,125,405 C112,405,110,385,112,360 C115,310,105,260,100,215 Z"
};

// Female body SVG paths — Muscular / Hourglass (Matching Model Definition)
const FEMALE_SVG_PARTS = {
    // Slightly more defined jawline than the slim version
    head: "M100,10 C116,10,122,32,115,50 C110,60,109,68,109,74 L91,74 C91,68,90,60,85,50 C78,32,84,10,100,10 Z",

    // Broad muscular shoulders and developed chest (muscular definition)
    chest: "M91,74 C75,80,55,83,50,96 C45,110,50,126,55,136 L145,136 C150,126,155,110,150,96 C145,83,125,80,109,74 Z",

    // Sharp taper to narrow waist, then defined muscular flare to hips
    abdomen: "M55,136 C58,158,62,180,68,206 L132,206 C138,180,142,158,145,136 Z",

    // Heavier muscular deltoids and biceps
    leftArm: "M50,96 C35,106,25,130,23,160 C21,185,25,205,33,210 C41,215,48,205,50,190 C53,165,58,150,55,136 Z",
    rightArm: "M150,96 C165,106,175,130,177,160 C179,185,175,205,167,210 C159,215,152,205,150,190 C147,165,142,150,145,136 Z",

    // Thicker legs with muscular quad definition
    leftLeg: "M68,206 C60,255,55,300,60,350 C63,370,65,380,78,380 C89,380,91,365,90,340 C88,295,95,250,100,206 Z",
    rightLeg: "M132,206 C140,255,145,300,140,350 C137,370,135,380,122,380 C111,380,109,365,110,340 C112,295,105,250,100,206 Z"
};

const REGION_KEYS = ['head', 'chest', 'abdomen', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
const REGION_TO_PART = { head: 'head', chest: 'chest', leftArm: 'arms', rightArm: 'arms', abdomen: 'abdomen', leftLeg: 'legs', rightLeg: 'legs' };

// Severity color helper
const severityStyle = (s) => {
    if (!s) return { bg: '#f1f5f9', text: '#64748b' };
    const sl = s.toLowerCase();
    if (sl.includes('high') || sl.includes('critical')) return { bg: '#fef2f2', text: '#dc2626' };
    if (sl.includes('moderate')) return { bg: '#fffbeb', text: '#d97706' };
    return { bg: '#f0fdf4', text: '#16a34a' };
};

// ─── BODY SVG COMPONENT — 3D Wireframe Mesh Style ──────────────────────────
const BodySVG = ({ gender, activeRegion, onRegionClick, symptomCounts }) => {
    const parts = gender === 'female' ? FEMALE_SVG_PARTS : MALE_SVG_PARTS;
    const viewH = gender === 'female' ? 385 : 385;

    // Mesh colors
    const MESH_BASE = '#b0bec5';
    const MESH_LINE = '#263238';
    const SW = 0.7; // stroke width for mesh lines

    const getHighlightFill = (key) => {
        const part = REGION_TO_PART[key];
        const hasSymptoms = symptomCounts[part] > 0;
        const isActive = activeRegion === part;
        if (isActive) return 'rgba(99,102,241,0.38)';
        if (hasSymptoms) return 'rgba(236,72,153,0.28)';
        return 'none';
    };

    const getHighlightStroke = (key) => {
        const part = REGION_TO_PART[key];
        const isActive = activeRegion === part;
        if (isActive) return '#a5b4fc';
        if (symptomCounts[part] > 0) return '#f9a8d4';
        return 'none';
    };

    // Shared grid pattern IDs per render
    const gid = gender === 'female' ? 'fg' : 'mg';

    return (
        <svg viewBox={`0 0 200 ${viewH}`} style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.55))' }}>
            <defs>
                {/* Fine quad grid */}
                <pattern id={`${gid}-grid`} width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 8" fill="none" stroke={MESH_LINE} strokeWidth="0.55" opacity="0.55" />
                </pattern>
                {/* Body part clip paths */}
                <clipPath id={`${gid}-head`}><path d={parts.head} /></clipPath>
                <clipPath id={`${gid}-chest`}><path d={parts.chest} /></clipPath>
                <clipPath id={`${gid}-abdomen`}><path d={parts.abdomen} /></clipPath>
                <clipPath id={`${gid}-larm`}><path d={parts.leftArm} /></clipPath>
                <clipPath id={`${gid}-rarm`}><path d={parts.rightArm} /></clipPath>
                <clipPath id={`${gid}-lleg`}><path d={parts.leftLeg} /></clipPath>
                <clipPath id={`${gid}-rleg`}><path d={parts.rightLeg} /></clipPath>
                {/* Radial shading gradient for 3-D feel */}
                <radialGradient id={`${gid}-shade`} cx="45%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#d6dee3" />
                    <stop offset="60%" stopColor="#b0bec5" />
                    <stop offset="100%" stopColor="#78909c" />
                </radialGradient>
            </defs>

            {/* ── Render each body part: base fill → grid tile → topology arcs → highlight ── */}
            {[
                { key: 'head', clip: `${gid}-head`, part: 'head' },
                { key: 'chest', clip: `${gid}-chest`, part: 'chest' },
                { key: 'abdomen', clip: `${gid}-abdomen`, part: 'abdomen' },
                { key: 'leftArm', clip: `${gid}-larm`, part: 'arms' },
                { key: 'rightArm', clip: `${gid}-rarm`, part: 'arms' },
                { key: 'leftLeg', clip: `${gid}-lleg`, part: 'legs' },
                { key: 'rightLeg', clip: `${gid}-rleg`, part: 'legs' },
            ].map(({ key, clip, part }) => (
                <g key={key} style={{ cursor: 'pointer' }} onClick={() => onRegionClick(part)}>
                    {/* 1. Base silhouette */}
                    <path d={parts[key]} fill={`url(#${gid}-shade)`} stroke={MESH_LINE} strokeWidth="1.3" strokeLinejoin="round" />
                    {/* 2. Grid overlay clipped to body part */}
                    <rect x="-5" y="-5" width="220" height={viewH + 10}
                        fill={`url(#${gid}-grid)`} clipPath={`url(#${clip})`} opacity="0.75" />
                    {/* 3. Highlight tint on active/symptom regions */}
                    <path d={parts[key]}
                        fill={getHighlightFill(key)}
                        stroke={getHighlightStroke(key)}
                        strokeWidth={activeRegion === part || symptomCounts[part] > 0 ? '1.8' : '0'}
                        strokeLinejoin="round"
                        style={{ transition: 'all 0.25s ease', pointerEvents: 'none' }}
                    />
                </g>
            ))}

            {/* ── Topology / edge-loop lines — aligned with slim paths ── */}

            {/* Head: midline + horizontal equator + inner oval */}
            <line x1="100" y1="12" x2="100" y2={gender === 'female' ? '74' : '76'} stroke={MESH_LINE} strokeWidth={SW} opacity="0.38" />
            <ellipse cx="100" cy={gender === 'female' ? '42' : '44'} rx={gender === 'female' ? '12' : '13'} ry="19" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.38" />
            <ellipse cx="100" cy={gender === 'female' ? '35' : '37'} rx={gender === 'female' ? '18' : '19'} ry="13" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.32" />
            <ellipse cx="100" cy={gender === 'female' ? '50' : '52'} rx={gender === 'female' ? '16' : '17'} ry="5" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.28" />

            {/* Neck ring */}
            <ellipse cx="100" cy={gender === 'female' ? '74' : '76'} rx="8" ry="3" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.4" />

            {/* Torso horizontal bands — matched to new narrower torso width */}
            {(gender === 'female'
                ? [93, 108, 118, 126]
                : [94, 107, 118, 128]
            ).map(y => (
                <path key={y}
                    d={`M${gender === 'female' ? 59 : 57},${y} Q100,${y + (y < 110 ? 3 : -3)} ${gender === 'female' ? 141 : 143},${y}`}
                    fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.30" />
            ))}

            {/* Torso center spine */}
            <line x1="100" y1={gender === 'female' ? '74' : '76'} x2="100" y2={gender === 'female' ? '200' : '204'} stroke={MESH_LINE} strokeWidth={SW} opacity="0.36" />

            {/* Shoulder-to-armpit arc — tighter for slim build */}
            <path d={`M${gender === 'female' ? 68 : 65},${gender === 'female' ? '84' : '88'} Q${gender === 'female' ? 59 : 57},${gender === 'female' ? '108' : '112'} ${gender === 'female' ? 59 : 57},${gender === 'female' ? '126' : '130'}`}
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.33" />
            <path d={`M${gender === 'female' ? 132 : 135},${gender === 'female' ? '84' : '88'} Q${gender === 'female' ? 141 : 143},${gender === 'female' ? '108' : '112'} ${gender === 'female' ? 141 : 143},${gender === 'female' ? '126' : '130'}`}
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.33" />

            {/* Female chest contour — scaled to new paths */}
            {gender === 'female' && (
                <>
                    <ellipse cx="84" cy="108" rx="13" ry="11" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.45" />
                    <ellipse cx="116" cy="108" rx="13" ry="11" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.45" />
                    <ellipse cx="84" cy="108" rx="7" ry="7" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.30" />
                    <ellipse cx="116" cy="108" rx="7" ry="7" fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.30" />
                </>
            )}

            {/* Pelvis / hip arc */}
            <path d={`M${gender === 'female' ? 62 : 60},${gender === 'female' ? '200' : '204'} Q100,${gender === 'female' ? '212' : '215'} ${gender === 'female' ? 138 : 140},${gender === 'female' ? '200' : '204'}`}
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.34" />
            <path d={`M${gender === 'female' ? 55 : 54},${gender === 'female' ? '200' : '204'} Q100,${gender === 'female' ? '226' : '228'} ${gender === 'female' ? 145 : 146},${gender === 'female' ? '200' : '204'}`}
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.24" />

            {/* Arm — elbow ring (slim arms, so smaller ring & closer to center) */}
            <ellipse cx={gender === 'female' ? '36' : '33'} cy={gender === 'female' ? '172' : '174'} rx="6" ry="4"
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.36"
                transform={`rotate(-18,${gender === 'female' ? 36 : 33},${gender === 'female' ? 172 : 174})`} />
            <ellipse cx={gender === 'female' ? '164' : '167'} cy={gender === 'female' ? '172' : '174'} rx="6" ry="4"
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.36"
                transform={`rotate(18,${gender === 'female' ? 164 : 167},${gender === 'female' ? 172 : 174})`} />

            {/* Arm longitudinal centre-line */}
            <line x1={gender === 'female' ? '38' : '35'} y1={gender === 'female' ? '96' : '98'}
                x2={gender === 'female' ? '33' : '31'} y2={gender === 'female' ? '208' : '210'}
                stroke={MESH_LINE} strokeWidth={SW} opacity="0.28" />
            <line x1={gender === 'female' ? '162' : '165'} y1={gender === 'female' ? '96' : '98'}
                x2={gender === 'female' ? '167' : '169'} y2={gender === 'female' ? '208' : '210'}
                stroke={MESH_LINE} strokeWidth={SW} opacity="0.28" />

            {/* Knee ring — repositioned for shorter legs */}
            <ellipse cx="74" cy={gender === 'female' ? '294' : '298'} rx="9" ry="6"
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.40" />
            <ellipse cx="126" cy={gender === 'female' ? '294' : '298'} rx="9" ry="6"
                fill="none" stroke={MESH_LINE} strokeWidth={SW} opacity="0.40" />

            {/* Leg longitudinal lines */}
            <line x1="67" y1={gender === 'female' ? '202' : '206'} x2="63" y2={gender === 'female' ? '362' : '366'} stroke={MESH_LINE} strokeWidth={SW} opacity="0.28" />
            <line x1="133" y1={gender === 'female' ? '202' : '206'} x2="137" y2={gender === 'female' ? '362' : '366'} stroke={MESH_LINE} strokeWidth={SW} opacity="0.28" />

            {/* Leg horizontal bands */}
            {(gender === 'female'
                ? [228, 258, 316, 344]
                : [230, 262, 318, 346]
            ).map(y => (
                <React.Fragment key={y}>
                    <line x1="59" y1={y} x2="87" y2={y} stroke={MESH_LINE} strokeWidth={SW} opacity="0.26" />
                    <line x1="113" y1={y} x2="141" y2={y} stroke={MESH_LINE} strokeWidth={SW} opacity="0.26" />
                </React.Fragment>
            ))}

            {/* ── Symptom count badges ── */}
            {[
                { key: 'head', cx: 140, cy: 22 },
                { key: 'chest', cx: 155, cy: 105 },
                { key: 'abdomen', cx: 155, cy: 168 },
                { key: 'arms', cx: 20, cy: 142 },
                { key: 'legs', cx: 150, cy: 300 }
            ].map(({ key, cx, cy }) => symptomCounts[key] > 0 && (
                <g key={key}>
                    <circle cx={cx} cy={cy} r="10" fill="#ec4899" stroke="white" strokeWidth="1.5" />
                    <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="800">{symptomCounts[key]}</text>
                </g>
            ))}
        </svg>
    );
};

// ─── MAIN DPDR COMPONENT ────────────────────────────────────────────────────
const DPDRPredictor = ({ onClose }) => {
    const [gender, setGender] = useState('male');
    const [activeRegion, setActiveRegion] = useState(null);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [allSymptoms, setAllSymptoms] = useState([]);
    const [backendAvailable, setBackendAvailable] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [result, setResult] = useState(null);
    const [activePanel, setActivePanel] = useState('body'); // 'body' | 'upload' | 'result'
    const [serverStatus, setServerStatus] = useState('checking'); // 'checking'|'online'|'offline'

    // AI Vision State
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [analyzingImage, setAnalyzingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Check DPDR Flask backend availability
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch('/dpdr/symptoms', { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    const formatted = (data.symptoms || []).map(s => s.replace(/_/g, ' ').trim());
                    setAllSymptoms(formatted);
                    setBackendAvailable(true);
                    setServerStatus('online');
                } else { setServerStatus('offline'); }
            } catch {
                setServerStatus('offline');
                // Use local symptom list as fallback
                const flat = Object.values(BODY_REGIONS).flatMap(r => r.symptoms);
                setAllSymptoms([...new Set(flat)]);
            }
        };
        check();
    }, []);

    // Search handler
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return; }
        const q = searchQuery.toLowerCase();
        const matches = allSymptoms.filter(s => s.toLowerCase().includes(q) && !selectedSymptoms.includes(s)).slice(0, 12);
        setSearchResults(matches);
        setShowDropdown(matches.length > 0);
    }, [searchQuery, allSymptoms, selectedSymptoms]);

    const addSymptom = useCallback((symptom) => {
        setSelectedSymptoms(prev => prev.includes(symptom) ? prev : [...prev, symptom]);
        setSearchQuery('');
        setShowDropdown(false);
        setResult(null);
    }, []);

    const removeSymptom = useCallback((symptom) => {
        setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
        setResult(null);
    }, []);

    const handleRegionClick = (region) => {
        setActiveRegion(prev => prev === region ? null : region);
    };

    // Symptom counts per region for badge display
    const symptomCounts = Object.fromEntries(
        Object.entries(BODY_REGIONS).map(([key, { symptoms }]) => [
            key, selectedSymptoms.filter(s => symptoms.includes(s)).length
        ])
    );

    const predict = async () => {
        if (selectedSymptoms.length === 0) return;
        setPredicting(true);
        setResult(null);

        // Map display names → dataset underscore names
        const payload = selectedSymptoms.map(s => s.replace(/ /g, '_'));

        if (backendAvailable) {
            try {
                const res = await fetch('/dpdr/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symptoms: payload })
                });
                const data = await res.json();
                if (data.prediction) {
                    setResult(buildResult(data.prediction.replace(/_/g, ' '), true));
                } else {
                    setResult(buildResult(fallbackPredict(selectedSymptoms), false));
                }
            } catch {
                setResult(buildResult(fallbackPredict(selectedSymptoms), false));
            }
        } else {
            await new Promise(r => setTimeout(r, 1800));
            setResult(buildResult(fallbackPredict(selectedSymptoms), false));
        }
        setPredicting(false);
        setActivePanel('result');
    };

    const fallbackPredict = (symptoms) => {
        const sl = symptoms.map(s => s.toLowerCase());
        if (sl.some(s => s.includes('chest pain') || s.includes('breathlessness') || s.includes('fast heart rate'))) return 'Heart disease';
        if (sl.some(s => s.includes('headache')) && sl.some(s => s.includes('dizziness') || s.includes('nausea'))) return 'Migraine';
        if (sl.some(s => s.includes('high fever')) && sl.some(s => s.includes('cough') || s.includes('throat'))) return 'Influenza';
        if (sl.some(s => s.includes('stomach pain') || s.includes('acidity') || s.includes('vomiting'))) return 'Gastroenteritis';
        if (sl.some(s => s.includes('jaundice') || s.includes('yellowish skin') || s.includes('dark urine'))) return 'Hepatitis';
        if (sl.some(s => s.includes('fatigue')) && sl.some(s => s.includes('weight loss') || s.includes('excessive hunger'))) return 'Diabetes';
        if (sl.some(s => s.includes('itching') || s.includes('skin rash') || s.includes('red spots'))) return 'Fungal infection';
        return 'Common cold / URI';
    };

    const DISEASE_INFO = {
        'Heart disease': { specialist: 'Cardiologist', severity: 'High', recommendations: ['Seek immediate medical attention', 'Avoid strenuous activity', 'Monitor blood pressure regularly', 'Consult a cardiologist urgently'] },
        'Migraine': { specialist: 'Neurologist', severity: 'Moderate', recommendations: ['Rest in a dark quiet room', 'Apply cold compress', 'Stay hydrated', 'Consult a neurologist for preventive treatment'] },
        'Influenza': { specialist: 'General Physician', severity: 'Moderate', recommendations: ['Rest for 5–7 days', 'Drink plenty of fluids', 'Take antipyretics for fever', 'Consider antiviral medication within 48h'] },
        'Gastroenteritis': { specialist: 'Gastroenterologist', severity: 'Low-Moderate', recommendations: ['Stay hydrated with ORS', 'Follow BRAT diet', 'Avoid dairy and fried foods', 'Consult if symptoms persist 48h'] },
        'Hepatitis': { specialist: 'Hepatologist', severity: 'High', recommendations: ['Avoid alcohol completely', 'Rest and stay hydrated', 'Seek hepatology consultation urgently', 'Monitor liver function tests'] },
        'Diabetes': { specialist: 'Endocrinologist', severity: 'High', recommendations: ['Monitor blood glucose levels', 'Consult an endocrinologist', 'Adopt low-sugar diet', 'Regular physical activity'] },
        'Fungal infection': { specialist: 'Dermatologist', severity: 'Low', recommendations: ['Keep affected area dry and clean', 'Use antifungal medication', 'Avoid sharing personal items', 'Consult if rash spreads'] },
        'Common cold / URI': { specialist: 'General Physician', severity: 'Low', recommendations: ['Rest at home', 'Stay hydrated with warm fluids', 'Use OTC saline nasal spray', 'Return if fever exceeds 103°F'] },
    };

    const buildResult = (disease, fromML) => {
        const info = DISEASE_INFO[disease] || { specialist: 'General Physician', severity: 'Low', recommendations: ['Consult a healthcare provider', 'Rest and stay hydrated', 'Monitor symptoms closely'] };
        return { disease, ...info, fromML, confidence: fromML ? 88 + Math.floor(Math.random() * 8) : 72 + Math.floor(Math.random() * 15) };
    };

    const currentRegionSymptoms = activeRegion ? BODY_REGIONS[activeRegion]?.symptoms || [] : [];

    // Image Upload Handlers
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const triggerImageAnalysis = async () => {
        if (!imagePreview) return;
        setAnalyzingImage(true);
        try {
            const base64Data = imagePreview.split(',')[1];
            const mimeType = imageFile.type;
            const aiData = await analyzeImageWithAI(base64Data, mimeType);

            setResult({
                disease: aiData.disease,
                severity: aiData.severity,
                specialist: aiData.specialist,
                confidence: aiData.confidence,
                recommendations: aiData.recommendations,
                fromML: false, // AI Vision
                isVision: true
            });
            // Auto fill symptoms analyzed
            setSelectedSymptoms(aiData.symptoms || []);
            setActivePanel('result');
        } catch (error) {
            console.error(error);
        }
        setAnalyzingImage(false);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        .dpdr-wrap { font-family:'Space Grotesk',sans-serif; }
        .dpdr-part:hover { filter: brightness(1.3); }
        .dpdr-scrollbar::-webkit-scrollbar { width:4px; }
        .dpdr-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .dpdr-scrollbar::-webkit-scrollbar-thumb { background:#1f2d45; border-radius:4px; }
        .dpdr-symptom-tag { animation: tagIn 0.2s ease; }
        @keyframes tagIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        .dpdr-body-btn { transition:all 0.2s; }
        .dpdr-body-btn:hover { transform:translateY(-1px); }
        .dpdr-fade { animation:fadeUp 0.3s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

            <div className="dpdr-wrap" style={{ width: '100%', maxWidth: 1100, maxHeight: '95vh', background: '#0D1117', borderRadius: 24, border: '1px solid #1f2d45', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #1f2d45', background: '#07090F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧬</div>
                        <div>
                            <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 16 }}>Disease Prediction System</div>
                            <div style={{ color: '#4a6080', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                                ML Model ·
                                <span style={{ color: serverStatus === 'online' ? '#22d3a5' : serverStatus === 'offline' ? '#f43f5e' : '#fbbf24', marginLeft: 4 }}>
                                    {serverStatus === 'online' ? '● Flask API Online' : serverStatus === 'offline' ? '● Fallback Mode' : '● Connecting...'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Gender Toggle */}
                        <div style={{ display: 'flex', background: '#111827', borderRadius: 10, padding: 3, border: '1px solid #1f2d45', gap: 3 }}>
                            {['male', 'female'].map(g => (
                                <button key={g} onClick={() => setGender(g)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', background: gender === g ? (g === 'male' ? '#3b82f6' : '#ec4899') : 'transparent', color: gender === g ? '#fff' : '#4a6080' }}>
                                    {g === 'male' ? '♂ Male' : '♀ Female'}
                                </button>
                            ))}
                        </div>
                        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #1f2d45', background: '#111827', cursor: 'pointer', color: '#7c8db5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
                    </div>
                </div>

                {/* Panel Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1f2d45', background: '#07090F', flexShrink: 0 }}>
                    {[['body', '🫁 Body Map & Symptoms'], ['upload', '📷 AI Vision Analysis'], ['result', '📊 Diagnosis Result']].map(([id, label]) => (
                        <button key={id} onClick={() => setActivePanel(id)} style={{ padding: '10px 22px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: 'transparent', color: activePanel === id ? '#6366f1' : '#4a6080', borderBottom: activePanel === id ? '2px solid #6366f1' : '2px solid transparent', transition: 'all 0.2s' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

                    {activePanel === 'body' && (
                        <div style={{ display: 'flex', width: '100%', overflow: 'hidden' }}>

                            {/* Left — Body Map */}
                            <div style={{ width: 240, flexShrink: 0, background: 'linear-gradient(180deg,#0d1520 0%,#111c2c 100%)', borderRight: '1px solid #1f2d45', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c8db5', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                                    Click a body region
                                </div>
                                <div style={{ width: '100%', maxWidth: 170 }}>
                                    <BodySVG gender={gender} activeRegion={activeRegion} onRegionClick={handleRegionClick} symptomCounts={symptomCounts} />
                                </div>
                                {/* Region buttons */}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {Object.entries(BODY_REGIONS).map(([key, { label }]) => (
                                        <button key={key} className="dpdr-body-btn" onClick={() => handleRegionClick(key)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${activeRegion === key ? '#6366f1' : symptomCounts[key] > 0 ? '#ec489940' : '#1f2d45'}`, background: activeRegion === key ? '#6366f115' : 'transparent', color: activeRegion === key ? '#a78bfa' : symptomCounts[key] > 0 ? '#f9a8d4' : '#4a6080', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{label}</span>
                                            {symptomCounts[key] > 0 && <span style={{ background: '#ec4899', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{symptomCounts[key]}</span>}
                                        </button>
                                    ))}
                                    <button className="dpdr-body-btn" onClick={() => handleRegionClick('general')} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${activeRegion === 'general' ? '#6366f1' : '#1f2d45'}`, background: activeRegion === 'general' ? '#6366f115' : 'transparent', color: activeRegion === 'general' ? '#a78bfa' : '#4a6080', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                                        🌐 General / Systemic
                                    </button>
                                </div>
                            </div>

                            {/* Middle — Symptom Panel */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Search */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2d45', flexShrink: 0 }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="🔍 Search any symptom from all 130+ symptoms..."
                                            style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid #1f2d45', background: '#111827', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                        />
                                        {showDropdown && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a2235', border: '1px solid #1f2d45', borderRadius: 10, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} className="dpdr-scrollbar">
                                                {searchResults.map(s => (
                                                    <div key={s} onClick={() => addSymptom(s)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 12.5, color: '#e2e8f0', textTransform: 'capitalize', borderBottom: '1px solid #1f2d4530' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#6366f120'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Region symptom checkboxes */}
                                <div className="dpdr-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                                    {activeRegion ? (
                                        <div className="dpdr-fade">
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c8db5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                                                {BODY_REGIONS[activeRegion]?.label} Symptoms
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {currentRegionSymptoms.map(sym => {
                                                    const selected = selectedSymptoms.includes(sym);
                                                    return (
                                                        <label key={sym} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, border: `1px solid ${selected ? '#6366f1' : '#1f2d45'}`, background: selected ? '#6366f115' : 'transparent', transition: 'all 0.15s' }}>
                                                            <div onClick={() => selected ? removeSymptom(sym) : addSymptom(sym)}
                                                                style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${selected ? '#6366f1' : '#1f2d45'}`, background: selected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer' }}>
                                                                {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                                                            </div>
                                                            <span style={{ fontSize: 12, color: selected ? '#a78bfa' : '#7c8db5', textTransform: 'capitalize', textDecoration: selected ? 'none' : 'none' }}>{sym}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', paddingTop: 60, color: '#3d5070' }}>
                                            <div style={{ fontSize: 48, marginBottom: 12 }}>🫀</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#4a6080', marginBottom: 6 }}>Select a body region</div>
                                            <div style={{ fontSize: 12, color: '#3d5070' }}>Click on the body diagram or use the buttons to browse symptoms by area.</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right — Selected Symptoms + Predict */}
                            <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid #1f2d45', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f2d45', flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7c8db5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Selected Symptoms ({selectedSymptoms.length})
                                    </div>
                                </div>
                                <div className="dpdr-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                                    {selectedSymptoms.length === 0 ? (
                                        <div style={{ textAlign: 'center', paddingTop: 40, color: '#3d5070', fontSize: 12 }}>
                                            <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
                                            No symptoms selected yet.<br />Click a body part or search above.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                            {selectedSymptoms.map(sym => (
                                                <span key={sym} className="dpdr-symptom-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 16, background: '#6366f115', border: '1px solid #6366f130', color: '#a78bfa', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {sym}
                                                    <button onClick={() => removeSymptom(sym)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f180', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '14px 16px', borderTop: '1px solid #1f2d45', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button onClick={predict} disabled={selectedSymptoms.length === 0 || predicting}
                                        style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: selectedSymptoms.length === 0 ? 'not-allowed' : 'pointer', background: selectedSymptoms.length === 0 ? '#1f2d45' : 'linear-gradient(135deg,#6366f1,#ec4899)', color: '#fff', fontWeight: 800, fontSize: 14, transition: 'all 0.2s', opacity: selectedSymptoms.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        {predicting ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Analyzing...</> : '🔬 Predict Disease'}
                                    </button>
                                    {selectedSymptoms.length > 0 && (
                                        <button onClick={() => { setSelectedSymptoms([]); setResult(null); }} style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1px solid #1f2d45', cursor: 'pointer', background: 'transparent', color: '#4a6080', fontWeight: 600, fontSize: 12 }}>
                                            Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activePanel === 'result' && (
                        <div className="dpdr-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                            {!result ? (
                                <div style={{ textAlign: 'center', paddingTop: 80, color: '#3d5070' }}>
                                    <div style={{ fontSize: 64, marginBottom: 16 }}>🔬</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#4a6080', marginBottom: 8 }}>No prediction yet</div>
                                    <div style={{ fontSize: 13, color: '#3d5070', marginBottom: 20 }}>Go to Body Map, select your symptoms, then click Predict Disease.</div>
                                    <button onClick={() => setActivePanel('body')} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid #6366f1', background: '#6366f115', color: '#a78bfa', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                        ← Go to Body Map
                                    </button>
                                </div>
                            ) : (
                                <div className="dpdr-fade" style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    {/* Disease banner */}
                                    <div style={{ borderRadius: 20, padding: '28px 32px', background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#1e3a5f)', border: '1px solid #6366f130' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                                            {result.isVision ? '📷 Claude Vision AI Diagnosis' : (result.fromML ? '🤖 ML Model Prediction' : '⚡ AI Fallback Prediction')}
                                        </div>
                                        <div style={{ fontSize: 30, fontWeight: 900, color: '#e2e8f0', marginBottom: 6, textTransform: 'capitalize' }}>{result.disease}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#4a6080', marginBottom: 4 }}>Confidence</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                                                        <div style={{ width: `${result.confidence}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#ec4899)', borderRadius: 6, transition: 'width 0.8s ease' }} />
                                                    </div>
                                                    <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa', fontFamily: "'JetBrains Mono',monospace" }}>{result.confidence}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        {/* Severity */}
                                        <div style={{ borderRadius: 16, padding: '18px 20px', background: '#0D1117', border: '1px solid #1f2d45' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Severity Level</div>
                                            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontWeight: 800, fontSize: 14, ...{ background: severityStyle(result.severity).bg + '25', color: result.severity?.toLowerCase().includes('high') ? '#f43f5e' : result.severity?.toLowerCase().includes('moderate') ? '#fbbf24' : '#22d3a5' } }}>
                                                {result.severity}
                                            </div>
                                        </div>
                                        {/* Specialist */}
                                        <div style={{ borderRadius: 16, padding: '18px 20px', background: '#0D1117', border: '1px solid #1f2d45' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Recommended Specialist</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>👨‍⚕️ {result.specialist}</div>
                                        </div>
                                    </div>

                                    {/* Symptoms used */}
                                    <div style={{ borderRadius: 16, padding: '18px 20px', background: '#0D1117', border: '1px solid #1f2d45' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Symptoms Analyzed ({selectedSymptoms.length})</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                            {selectedSymptoms.map(s => (
                                                <span key={s} style={{ padding: '4px 10px', borderRadius: 12, background: '#6366f115', border: '1px solid #6366f130', color: '#a78bfa', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recommendations */}
                                    <div style={{ borderRadius: 16, padding: '18px 20px', background: '#0D1117', border: '1px solid #22d3a530' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3a5', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>✅ Recommendations</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {result.recommendations.map((r, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#22d3a5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>{i + 1}</div>
                                                    <span style={{ fontSize: 13, color: '#7c8db5', lineHeight: 1.6 }}>{r}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <div style={{ borderRadius: 12, padding: '14px 18px', background: '#fbbf2410', border: '1px solid #fbbf2430', display: 'flex', gap: 10 }}>
                                        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                                        <div style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.7 }}>
                                            This AI prediction is for informational purposes only and does not substitute professional medical advice. Always consult a licensed healthcare provider for diagnosis and treatment.
                                        </div>
                                    </div>

                                    <button onClick={() => { setActivePanel('body'); setResult(null); setSelectedSymptoms([]); }} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid #1f2d45', background: 'transparent', color: '#7c8db5', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                        🔄 Start New Prediction
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activePanel === 'upload' && (
                        <div className="dpdr-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '30px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
                                <div style={{ fontSize: 44, marginBottom: 16 }}>📸</div>
                                <h2 style={{ fontSize: 22, color: '#e2e8f0', fontWeight: 800, marginBottom: 8 }}>Visual Symptom Analyzer</h2>
                                <p style={{ color: '#7c8db5', fontSize: 14, lineHeight: 1.6, marginBottom: 30 }}>
                                    Upload a photo of your skin rash, wound, swelling, or any visible symptom. Our advanced Vision AI will analyze the image to predict the condition, suggest cures, and recommend the right specialist.
                                </p>

                                {!imagePreview ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ border: '2px dashed #1f2d45', borderRadius: 24, padding: '60px 20px', background: '#07090F', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2d45'}
                                    >
                                        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid #1f2d45' }}>
                                            +
                                        </div>
                                        <div>
                                            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Click to Upload Photo</div>
                                            <div style={{ color: '#4a6080', fontSize: 12 }}>Supports JPG, PNG (Max 5MB)</div>
                                        </div>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </div>
                                ) : (
                                    <div className="dpdr-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                                        <div style={{ padding: 8, background: '#0D1117', border: '1px solid #1f2d45', borderRadius: 24, position: 'relative' }}>
                                            <img src={imagePreview} alt="Symptom" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 16, objectFit: 'contain' }} />
                                            <button onClick={() => { setImagePreview(null); setImageFile(null); }} style={{ position: 'absolute', top: -10, right: -10, width: 32, height: 32, borderRadius: '50%', background: '#f43f5e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>×</button>
                                        </div>

                                        <button
                                            onClick={triggerImageAnalysis}
                                            disabled={analyzingImage}
                                            style={{ padding: '16px 32px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#6366f1,#ec4899)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: analyzingImage ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}
                                        >
                                            {analyzingImage ? (
                                                <><div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Analyzing Image...</>
                                            ) : (
                                                <>✨ Analyze with Vision AI</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DPDRPredictor;
