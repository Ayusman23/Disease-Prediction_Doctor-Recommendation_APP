import React from 'react';

/* ──────────────────────────────────────────────
   Wireframe / mesh human body models
   Inspired by 3-D base-mesh reference figures
   Female (left) + Male (right), T-pose
─────────────────────────────────────────────── */

const GRID_FILL = '#c8cfd8';
const LINE = '#374151';
const STROKE_W = 0.9;

/* Reusable grid-pattern defs ─ one per figure so IDs don't clash */
function GridDefs({ id }) {
    return (
        <defs>
            <pattern id={`grid-${id}`} width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.55" />
            </pattern>
            <pattern id={`curvy-${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 8 0 Q 12 4 8 8 Q 4 12 8 16" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
                <path d="M 0 8 Q 4 12 8 8 Q 12 4 16 8" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
            </pattern>
            <filter id={`shadow-${id}`} x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#1e293b" floodOpacity="0.18" />
            </filter>
        </defs>
    );
}

/* ── FEMALE FIGURE ── */
function Female({ x = 0, y = 0 }) {
    const id = 'f';
    // All coordinates are relative; we wrap in a <g transform>
    return (
        <g transform={`translate(${x},${y})`} filter={`url(#shadow-${id})`}>
            <GridDefs id={id} />

            {/* HEAD */}
            <ellipse cx="60" cy="22" rx="17" ry="20" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="60" cy="22" rx="17" ry="20" fill={`url(#grid-${id})`} opacity="0.7" />
            {/* head dividers */}
            <line x1="60" y1="2" x2="60" y2="42" stroke={LINE} strokeWidth={STROKE_W} opacity="0.4" />
            <ellipse cx="60" cy="22" rx="10" ry="20" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <ellipse cx="60" cy="22" rx="17" ry="8" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />

            {/* NECK */}
            <rect x="52" y="40" width="16" height="14" rx="3" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <rect x="52" y="40" width="16" height="14" rx="3" fill={`url(#grid-${id})`} opacity="0.7" />

            {/* TORSO */}
            <path d="M32,54 Q28,62 30,90 Q32,108 36,116 L84,116 Q88,108 90,90 Q92,62 88,54 Q78,50 60,50 Q42,50 32,54 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M32,54 Q28,62 30,90 Q32,108 36,116 L84,116 Q88,108 90,90 Q92,62 88,54 Q78,50 60,50 Q42,50 32,54 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* torso grid lines */}
            <line x1="60" y1="50" x2="60" y2="116" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
            <line x1="30" y1="70" x2="90" y2="70" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="30" y1="90" x2="90" y2="90" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="31" y1="80" x2="89" y2="80" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            {/* chest contour */}
            <ellipse cx="48" cy="67" rx="11" ry="9" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />
            <ellipse cx="72" cy="67" rx="11" ry="9" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />

            {/* LEFT ARM (viewer's right) */}
            <path d="M32,54 Q18,58 6,72 Q2,80 4,88 L12,90 Q14,84 18,78 Q26,66 38,62 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M32,54 Q18,58 6,72 Q2,80 4,88 L12,90 Q14,84 18,78 Q26,66 38,62 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* forearm */}
            <path d="M4,88 Q-2,96 -6,108 L2,112 Q6,100 12,90 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M4,88 Q-2,96 -6,108 L2,112 Q6,100 12,90 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* hand */}
            <ellipse cx="-4" cy="114" rx="7" ry="10" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="-4" cy="114" rx="7" ry="10" fill={`url(#grid-${id})`} opacity="0.6" />
            {/* finger lines */}
            {[-9, -5, -1, 3].map((fx, i) => (
                <line key={i} x1={fx} y1="118" x2={fx - 1} y2="126" stroke={LINE} strokeWidth={STROKE_W} opacity="0.5" />
            ))}

            {/* RIGHT ARM */}
            <path d="M88,54 Q102,58 114,72 Q118,80 116,88 L108,90 Q106,84 102,78 Q94,66 82,62 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M88,54 Q102,58 114,72 Q118,80 116,88 L108,90 Q106,84 102,78 Q94,66 82,62 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M116,88 Q122,96 126,108 L118,112 Q114,100 108,90 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M116,88 Q122,96 126,108 L118,112 Q114,100 108,90 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="124" cy="114" rx="7" ry="10" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="124" cy="114" rx="7" ry="10" fill={`url(#grid-${id})`} opacity="0.6" />
            {[119, 123, 127, 131].map((fx, i) => (
                <line key={i} x1={fx} y1="118" x2={fx + 1} y2="126" stroke={LINE} strokeWidth={STROKE_W} opacity="0.5" />
            ))}

            {/* PELVIS / HIPS */}
            <path d="M36,116 Q30,122 28,132 L92,132 Q90,122 84,116 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M36,116 Q30,122 28,132 L92,132 Q90,122 84,116 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="60" y1="116" x2="60" y2="132" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
            <line x1="28" y1="124" x2="92" y2="124" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />

            {/* LEFT LEG */}
            <path d="M28,132 Q24,148 26,170 Q28,190 30,210 L50,210 Q52,190 52,170 Q52,148 50,132 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M28,132 Q24,148 26,170 Q28,190 30,210 L50,210 Q52,190 52,170 Q52,148 50,132 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* knee */}
            <ellipse cx="39" cy="182" rx="11" ry="8" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />
            {/* lower leg */}
            <path d="M30,210 Q28,230 30,250 Q32,264 36,272 L46,272 Q50,264 50,250 Q52,230 50,210 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M30,210 Q28,230 30,250 Q32,264 36,272 L46,272 Q50,264 50,250 Q52,230 50,210 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* foot */}
            <path d="M30,272 Q26,278 24,284 L52,284 Q52,278 46,272 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M30,272 Q26,278 24,284 L52,284 Q52,278 46,272 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            {/* leg grid lines */}
            <line x1="39" y1="132" x2="39" y2="272" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="26" y1="160" x2="52" y2="160" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="26" y1="200" x2="52" y2="200" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="28" y1="240" x2="50" y2="240" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />

            {/* RIGHT LEG */}
            <path d="M70,132 Q68,148 68,170 Q68,190 70,210 L90,210 Q92,190 92,170 Q90,148 92,132 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M70,132 Q68,148 68,170 Q68,190 70,210 L90,210 Q92,190 92,170 Q90,148 92,132 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="81" cy="182" rx="11" ry="8" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />
            <path d="M70,210 Q68,230 70,250 Q72,264 74,272 L84,272 Q88,264 90,250 Q92,230 90,210 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M70,210 Q68,230 70,250 Q72,264 74,272 L84,272 Q88,264 90,250 Q92,230 90,210 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M70,272 Q68,278 68,284 L96,284 Q96,278 84,272 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M70,272 Q68,278 68,284 L96,284 Q96,278 84,272 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="81" y1="132" x2="81" y2="272" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="68" y1="160" x2="92" y2="160" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="68" y1="200" x2="92" y2="200" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="68" y1="240" x2="92" y2="240" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />

            {/* LABEL */}
            <text x="60" y="300" textAnchor="middle" fontSize="10" fontFamily="'DM Sans',sans-serif" fill="#64748b" fontWeight="600" letterSpacing="2">FEMALE</text>
        </g>
    );
}

/* ── MALE FIGURE ── */
function Male({ x = 0, y = 0 }) {
    const id = 'm';
    return (
        <g transform={`translate(${x},${y})`} filter={`url(#shadow-${id})`}>
            <GridDefs id={id} />

            {/* HEAD – slightly larger */}
            <ellipse cx="64" cy="22" rx="20" ry="22" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="64" cy="22" rx="20" ry="22" fill={`url(#grid-${id})`} opacity="0.7" />
            <line x1="64" y1="0" x2="64" y2="44" stroke={LINE} strokeWidth={STROKE_W} opacity="0.4" />
            <ellipse cx="64" cy="22" rx="12" ry="22" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <ellipse cx="64" cy="22" rx="20" ry="8" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />

            {/* NECK – broader */}
            <rect x="54" y="42" width="20" height="14" rx="3" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <rect x="54" y="42" width="20" height="14" rx="3" fill={`url(#grid-${id})`} opacity="0.7" />

            {/* TORSO – wider / squarer shoulders */}
            <path d="M26,56 Q22,66 24,92 Q26,112 30,120 L98,120 Q102,112 104,92 Q106,66 102,56 Q88,50 64,50 Q40,50 26,56 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M26,56 Q22,66 24,92 Q26,112 30,120 L98,120 Q102,112 104,92 Q106,66 102,56 Q88,50 64,50 Q40,50 26,56 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="64" y1="50" x2="64" y2="120" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
            <line x1="24" y1="72" x2="104" y2="72" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="24" y1="92" x2="104" y2="92" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="24" y1="82" x2="104" y2="82" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            {/* pec contour */}
            <path d="M38,58 Q28,64 30,76 Q40,80 56,76 Q64,72 56,62 Z" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.4" />
            <path d="M90,58 Q100,64 98,76 Q88,80 72,76 Q64,72 72,62 Z" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.4" />

            {/* LEFT ARM – thicker */}
            <path d="M26,56 Q10,60 -4,76 Q-8,84 -6,94 L4,96 Q6,88 10,80 Q20,68 36,64 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M26,56 Q10,60 -4,76 Q-8,84 -6,94 L4,96 Q6,88 10,80 Q20,68 36,64 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M-6,94 Q-12,104 -14,118 L-4,122 Q2,108 4,96 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M-6,94 Q-12,104 -14,118 L-4,122 Q2,108 4,96 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="-10" cy="122" rx="8" ry="11" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="-10" cy="122" rx="8" ry="11" fill={`url(#grid-${id})`} opacity="0.6" />
            {[-16, -12, -8, -4].map((fx, i) => (
                <line key={i} x1={fx} y1="127" x2={fx - 1} y2="136" stroke={LINE} strokeWidth={STROKE_W} opacity="0.5" />
            ))}

            {/* RIGHT ARM */}
            <path d="M102,56 Q118,60 132,76 Q136,84 134,94 L124,96 Q122,88 118,80 Q108,68 92,64 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M102,56 Q118,60 132,76 Q136,84 134,94 L124,96 Q122,88 118,80 Q108,68 92,64 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M134,94 Q140,104 142,118 L132,122 Q126,108 124,96 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M134,94 Q140,104 142,118 L132,122 Q126,108 124,96 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="138" cy="122" rx="8" ry="11" fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <ellipse cx="138" cy="122" rx="8" ry="11" fill={`url(#grid-${id})`} opacity="0.6" />
            {[132, 136, 140, 144].map((fx, i) => (
                <line key={i} x1={fx} y1="127" x2={fx + 1} y2="136" stroke={LINE} strokeWidth={STROKE_W} opacity="0.5" />
            ))}

            {/* PELVIS */}
            <path d="M30,120 Q26,128 26,136 L102,136 Q102,128 98,120 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M30,120 Q26,128 26,136 L102,136 Q102,128 98,120 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="64" y1="120" x2="64" y2="136" stroke={LINE} strokeWidth={STROKE_W} opacity="0.35" />
            <line x1="26" y1="128" x2="102" y2="128" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />

            {/* LEFT LEG */}
            <path d="M26,136 Q22,152 24,176 Q26,196 28,216 L50,216 Q52,196 52,176 Q52,152 50,136 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M26,136 Q22,152 24,176 Q26,196 28,216 L50,216 Q52,196 52,176 Q52,152 50,136 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="38" cy="188" rx="13" ry="9" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />
            <path d="M28,216 Q26,236 28,258 Q30,270 34,278 L48,278 Q52,270 52,258 Q52,236 50,216 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M28,216 Q26,236 28,258 Q30,270 34,278 L48,278 Q52,270 52,258 Q52,236 50,216 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M26,278 Q22,285 22,292 L54,292 Q54,285 48,278 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M26,278 Q22,285 22,292 L54,292 Q54,285 48,278 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="38" y1="136" x2="38" y2="278" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="24" y1="164" x2="52" y2="164" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="24" y1="204" x2="52" y2="204" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="26" y1="246" x2="52" y2="246" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />

            {/* RIGHT LEG */}
            <path d="M78,136 Q76,152 76,176 Q76,196 78,216 L100,216 Q102,196 104,176 Q106,152 102,136 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M78,136 Q76,152 76,176 Q76,196 78,216 L100,216 Q102,196 104,176 Q106,152 102,136 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <ellipse cx="90" cy="188" rx="13" ry="9" fill="none" stroke={LINE} strokeWidth={STROKE_W} opacity="0.45" />
            <path d="M78,216 Q76,236 78,258 Q80,270 82,278 L96,278 Q100,270 102,258 Q104,236 100,216 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M78,216 Q76,236 78,258 Q80,270 82,278 L96,278 Q100,270 102,258 Q104,236 100,216 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <path d="M76,278 Q74,285 74,292 L106,292 Q106,285 96,278 Z"
                fill={GRID_FILL} stroke={LINE} strokeWidth={STROKE_W} />
            <path d="M76,278 Q74,285 74,292 L106,292 Q106,285 96,278 Z"
                fill={`url(#grid-${id})`} opacity="0.6" />
            <line x1="90" y1="136" x2="90" y2="278" stroke={LINE} strokeWidth={STROKE_W} opacity="0.3" />
            <line x1="76" y1="164" x2="104" y2="164" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="76" y1="204" x2="104" y2="204" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />
            <line x1="76" y1="246" x2="104" y2="246" stroke={LINE} strokeWidth={STROKE_W} opacity="0.25" />

            {/* LABEL */}
            <text x="64" y="308" textAnchor="middle" fontSize="10" fontFamily="'DM Sans',sans-serif" fill="#64748b" fontWeight="600" letterSpacing="2">MALE</text>
        </g>
    );
}

/* ── EXPORTED COMPOSITE COMPONENT ── */
export default function WireframeHumans({ style = {}, className = '' }) {
    return (
        <div className={className} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', ...style }}>
            <svg
                viewBox="-30 0 430 320"
                width="100%"
                height="100%"
                style={{ maxHeight: '320px', overflow: 'visible' }}
            >
                {/* Female figure – left */}
                <Female x={0} y={0} />
                {/* Male figure – right, slightly overlapping */}
                <Male x={135} y={0} />
            </svg>
        </div>
    );
}
