import { useState, useEffect, useCallback, useRef } from "react";

// ─── THEME SYSTEM ──────────────────────────────────────────────────────────────
const THEMES = {
  'Ocean Dark': {
    bg: '#0A0F1A', bgCard: '#0E1525', bgElevated: '#131B2E', bgHover: '#1A2540',
    border: '#1E2D47', borderLight: '#243352',
    accent: '#00D4FF', accentDim: '#00A8CC', accentGlow: 'rgba(0,212,255,0.15)', accentSoft: 'rgba(0,212,255,0.08)',
    green: '#00E5A0', greenBg: 'rgba(0,229,160,0.1)',
    yellow: '#FFB800', yellowBg: 'rgba(255,184,0,0.1)',
    red: '#FF4D6A', redBg: 'rgba(255,77,106,0.1)',
    purple: '#A78BFA', purpleBg: 'rgba(167,139,250,0.1)',
    blue: '#3B9EFF', blueBg: 'rgba(59,158,255,0.1)',
    text: '#E8F0FE', textSub: '#7B91B8', textDim: '#4A6080', white: '#FFFFFF', mode: 'dark',
  },
  'Forest Dark': {
    bg: '#0A120E', bgCard: '#0D1A11', bgElevated: '#132018', bgHover: '#1A2E20',
    border: '#1C3024', borderLight: '#224030',
    accent: '#4ADE80', accentDim: '#22C55E', accentGlow: 'rgba(74,222,128,0.15)', accentSoft: 'rgba(74,222,128,0.08)',
    green: '#86EFAC', greenBg: 'rgba(134,239,172,0.1)',
    yellow: '#FDE047', yellowBg: 'rgba(253,224,71,0.1)',
    red: '#FB7185', redBg: 'rgba(251,113,133,0.1)',
    purple: '#C4B5FD', purpleBg: 'rgba(196,181,253,0.1)',
    blue: '#67E8F9', blueBg: 'rgba(103,232,249,0.1)',
    text: '#ECFDF5', textSub: '#6EE7B7', textDim: '#3D6B4F', white: '#FFFFFF', mode: 'dark',
  },
  'Crimson Dark': {
    bg: '#120A0A', bgCard: '#1A0D0D', bgElevated: '#221212', bgHover: '#2E1616',
    border: '#3D1A1A', borderLight: '#4D2020',
    accent: '#FF6B6B', accentDim: '#EF4444', accentGlow: 'rgba(255,107,107,0.15)', accentSoft: 'rgba(255,107,107,0.08)',
    green: '#4ADE80', greenBg: 'rgba(74,222,128,0.1)',
    yellow: '#FCD34D', yellowBg: 'rgba(252,211,77,0.1)',
    red: '#FF4D6A', redBg: 'rgba(255,77,106,0.1)',
    purple: '#E879F9', purpleBg: 'rgba(232,121,249,0.1)',
    blue: '#60A5FA', blueBg: 'rgba(96,165,250,0.1)',
    text: '#FEF2F2', textSub: '#FDA4AF', textDim: '#7F3B3B', white: '#FFFFFF', mode: 'dark',
  },
  'Soft Light': {
    bg: '#F8FAFB', bgCard: '#FFFFFF', bgElevated: '#F1F5F9', bgHover: '#E8F0FE',
    border: '#E2E8F0', borderLight: '#CBD5E1',
    accent: '#0EA5E9', accentDim: '#0284C7', accentGlow: 'rgba(14,165,233,0.15)', accentSoft: 'rgba(14,165,233,0.06)',
    green: '#10B981', greenBg: 'rgba(16,185,129,0.08)',
    yellow: '#F59E0B', yellowBg: 'rgba(245,158,11,0.08)',
    red: '#EF4444', redBg: 'rgba(239,68,68,0.08)',
    purple: '#8B5CF6', purpleBg: 'rgba(139,92,246,0.08)',
    blue: '#3B82F6', blueBg: 'rgba(59,130,246,0.08)',
    text: '#1E293B', textSub: '#64748B', textDim: '#94A3B8', white: '#FFFFFF', mode: 'light',
  },
  'Warm Ivory': {
    bg: '#FDFBF7', bgCard: '#FFFFFF', bgElevated: '#FAF7F2', bgHover: '#F0EBE0',
    border: '#E8DFD0', borderLight: '#D6C9B5',
    accent: '#D97706', accentDim: '#B45309', accentGlow: 'rgba(217,119,6,0.15)', accentSoft: 'rgba(217,119,6,0.06)',
    green: '#059669', greenBg: 'rgba(5,150,105,0.08)',
    yellow: '#D97706', yellowBg: 'rgba(217,119,6,0.08)',
    red: '#DC2626', redBg: 'rgba(220,38,38,0.08)',
    purple: '#7C3AED', purpleBg: 'rgba(124,58,237,0.08)',
    blue: '#2563EB', blueBg: 'rgba(37,99,235,0.08)',
    text: '#292524', textSub: '#78716C', textDim: '#A8A29E', white: '#FFFFFF', mode: 'light',
  },
};

// Dynamic T — will be replaced per render using active theme
let T = { ...THEMES['Ocean Dark'] };

// ─── CSS ANIMATIONS (theme-aware via CSS vars) ────────────────────────────────
const makeGlobalCSS = (theme) => `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${theme.bg}; transition: background 0.3s; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.accent}40; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes ringPop { 0% { transform: scale(1); } 30% { transform: scale(1.4) rotate(-10deg); } 60% { transform: scale(0.9) rotate(5deg); } 100% { transform: scale(1); } }
  @keyframes countUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes heartbeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.1); } 28% { transform: scale(1); } 42% { transform: scale(1.1); } 56% { transform: scale(1); } }
  @keyframes shimmerSlide { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .slide-in { animation: slideIn 0.25s ease forwards; }
  .slide-down { animation: slideDown 0.2s ease forwards; }
  .count-anim { animation: countUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .ring-pop { animation: ringPop 0.5s ease; }

  .nav-btn:hover { background: ${theme.accentSoft} !important; color: ${theme.accent} !important; }
  .nav-btn:hover svg { stroke: ${theme.accent} !important; }

  .card-hover { transition: all 0.2s ease; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,${theme.mode === 'dark' ? '0.3' : '0.08'}), 0 0 0 1px ${theme.accentGlow}; }

  .btn-primary { transition: all 0.2s ease; }
  .btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 8px 24px ${theme.accent}35; }
  .btn-primary:active { transform: translateY(0); }

  .stat-card:hover { border-color: ${theme.accent}40 !important; }
  .row-item:hover { background: ${theme.accentSoft} !important; }
  .theme-transition * { transition: background-color 0.25s, border-color 0.25s, color 0.15s; }

  input:focus, select:focus, textarea:focus { outline: none; border-color: ${theme.accent} !important; box-shadow: 0 0 0 3px ${theme.accentGlow}; }

  .tooltip-wrap { position: relative; }
  .tooltip-wrap:hover .tooltip { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .tooltip { opacity: 0; transform: translateY(4px); transition: all 0.2s; position: absolute; bottom: calc(100% + 6px); left: 50%; translate: -50% 0; background: ${theme.bgElevated}; color: ${theme.text}; padding: 5px 10px; border-radius: 6px; font-size: 11px; white-space: nowrap; border: 1px solid ${theme.border}; pointer-events: none; z-index: 100; }

  .pulsing { animation: pulse 2s infinite; }
  .heartbeat { animation: heartbeat 1.5s infinite; }

  .invoice-print { }
  @media print { .no-print { display: none !important; } .invoice-print { display: block !important; } }
`;

// ─── ICONS ─────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = 'currentColor', sw = 1.7, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const ic = {
  dash: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  cal: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  pill: "M10.5 20H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v7.5 M16 19h6M19 16v6",
  flask: "M9 3h6M6 21h12M4 21L8 3 M20 21L16 3M4 14h16",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  rec: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  chR: "M9 18l6-6-6-6",
  chL: "M15 18l-6-6 6-6",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  usr: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
  out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  set: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  help: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
  trend: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  clip: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2",
  msg: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8 M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  notes: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  timer: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2",
  steth: "M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3 M8 15v1a6 6 0 006 6 6 6 0 006-6v-4",
  bed: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  wifi: "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  lab: "M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2 M8.5 2h7 M14.5 16h-5",
  // NEW ICONS
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  invoice: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8",
  creditCard: "M1 4h22v16H1z M1 10h22",
  alarm: "M0 0h24v24H0z M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2 M4.93 4.93l1.41 1.41 M19.07 4.93l-1.41 1.41",
  reminder: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  palette: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5S18.33 11 17.5 11z",
  print: "M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
  send: "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const initials = n => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const fmt = d => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };
const fmtShort = d => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return d; } };
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().split('T')[0];

const AVATAR_COLORS = ['#00D4FF', '#00E5A0', '#A78BFA', '#FFB800', '#FF4D6A', '#3B9EFF', '#F97316', '#EC4899'];
const getColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

// ─── STORAGE ───────────────────────────────────────────────────────────────────
const STORE_KEY = 'medipredict_v4';
const loadDB = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } };
const saveDB = db => { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { } };
const initDB = user => ({
  doctor: {
    name: user?.name || 'Dr. Alex Morgan',
    email: user?.email || '',
    specialty: user?.specialty || 'General Physician',
    license: 'MD-' + (Math.random() * 900000 + 100000 | 0),
    experience: '',
    phone: '',
    hospital: '',
    bio: '',
    avatar: '',
  },
  patients: [],
  appointments: [],
  prescriptions: [],
  diagnoses: [],
  vitals: [],
  notes: [],
  notifications: [],
  tasks: [],
  invoices: [],   // billing invoices
  reminders: [],   // appointment reminders / alerts
  monthlyData: Array(12).fill(null).map(() => ({ completed: 0, missed: 0, cancelled: 0, scheduled: 0 })),
  activityScores: [],
  totalPrescriptions: 0,
  theme: 'Ocean Dark',
  analyticsCache: {},
});

// ─── MINI COMPONENTS ───────────────────────────────────────────────────────────

const Avatar = ({ name, size = 40, radius = 10 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    background: `linear-gradient(135deg, ${getColor(name)}30, ${getColor(name)}60)`,
    border: `1.5px solid ${getColor(name)}50`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, color: getColor(name), fontSize: size * 0.32,
    fontFamily: "'JetBrains Mono', monospace",
  }}>
    {initials(name)}
  </div>
);

const Badge = ({ children, color = T.accent, size = 'sm' }) => (
  <span style={{
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    borderRadius: 20, fontSize: size === 'sm' ? 10.5 : 12,
    fontWeight: 700, background: `${color}15`,
    color: color, border: `1px solid ${color}25`,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.02em',
  }}>{children}</span>
);

const STATUS_CONFIG = {
  scheduled: { color: T.blue, label: 'Scheduled' },
  completed: { color: T.green, label: 'Completed' },
  missed: { color: T.textDim, label: 'Missed' },
  cancelled: { color: T.red, label: 'Cancelled' },
  Active: { color: T.green, label: 'Active' },
  Completed: { color: T.textDim, label: 'Completed' },
  Stable: { color: T.green, label: 'Stable' },
  Improving: { color: T.blue, label: 'Improving' },
  'Under Treatment': { color: T.yellow, label: 'Treatment' },
  Critical: { color: T.red, label: 'Critical' },
  Discharged: { color: T.textDim, label: 'Discharged' },
};
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: T.textSub, label: status };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
};

const Divider = ({ my = 12 }) => (
  <div style={{ height: 1, background: T.border, margin: `${my}px 0` }} />
);

// ─── SPARKLINE ─────────────────────────────────────────────────────────────────
const SparkLine = ({ data = [], color = T.accent, height = 80, showArea = true }) => {
  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: 12 }}>
      Complete appointments to build your score graph
    </div>
  );
  const w = 500, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: i * (w / (data.length - 1)),
    y: h - ((v - min) / range) * (h - 16) - 4
  }));

  // Smooth curve
  const curve = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  const area = curve + ` L${pts[pts.length - 1].x},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="glow-filter">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {showArea && <path d={area} fill="url(#spark-grad)" />}
      <path d={curve} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d={curve} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.3" filter="url(#glow-filter)" />
      {/* Peak dot */}
      {pts.map((p, i) => data[i] === max && (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={T.bg} stroke={color} strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="2" fill={color} />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fill={color} fontSize="10" fontWeight="700"
            fontFamily="'JetBrains Mono', monospace">{data[i]}</text>
        </g>
      ))}
    </svg>
  );
};

// ─── BAR CHART ──────────────────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const now = new Date().getMonth();
  const visible = data.slice(0, now + 1);
  const allZero = visible.every(d => d.completed === 0 && d.missed === 0 && d.cancelled === 0);
  if (allZero) return (
    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: 12 }}>
      Appointment history appears here as you record data
    </div>
  );
  const max = Math.max(...visible.flatMap(d => [d.completed + d.missed + d.cancelled]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110, padding: '0 2px' }}>
      {visible.map((d, i) => {
        const total = d.completed + d.missed + d.cancelled;
        return (
          <div key={i} className="tooltip-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 90 }}>
              {d.completed > 0 && <div style={{ width: 6, height: `${(d.completed / max) * 90}%`, minHeight: 3, background: T.green, borderRadius: '2px 2px 0 0', opacity: 0.9 }} />}
              {d.missed > 0 && <div style={{ width: 6, height: `${(d.missed / max) * 90}%`, minHeight: 3, background: T.textDim, borderRadius: '2px 2px 0 0' }} />}
              {d.cancelled > 0 && <div style={{ width: 6, height: `${(d.cancelled / max) * 90}%`, minHeight: 3, background: T.yellow, borderRadius: '2px 2px 0 0', opacity: 0.8 }} />}
            </div>
            <span style={{ fontSize: 8, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{labels[i]}</span>
            <div className="tooltip">{labels[i]}: {total} total</div>
          </div>
        );
      })}
    </div>
  );
};

// ─── DONUT CHART ────────────────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 100, thickness = 18 }) => {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: 'all 0.6s ease', filter: `drop-shadow(0 0 4px ${seg.color}50)` }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

// ─── LIVE CLOCK ─────────────────────────────────────────────────────────────────
const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); });
  const color = type === 'error' ? T.red : type === 'warn' ? T.yellow : T.green;
  return (
    <div className="fade-in" style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: T.bgElevated, color: T.text, padding: '12px 18px',
      borderRadius: 12, fontSize: 12.5, fontWeight: 600,
      boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}30`,
      display: 'flex', alignItems: 'center', gap: 10,
      border: `1px solid ${color}30`,
      fontFamily: "'Space Grotesk', sans-serif",
      backdropFilter: 'blur(12px)',
      maxWidth: 320,
    }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ic d={type === 'error' ? ic.x : ic.check} size={13} color={color} />
      </div>
      {msg}
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, padding: 2 }}>
        <Ic d={ic.x} size={12} />
      </button>
    </div>
  );
};

// ─── MODAL ────────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, width = 520, icon }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
    <div className="fade-in" style={{
      background: T.bgCard, borderRadius: 20, padding: '24px 26px',
      width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
      fontFamily: "'Space Grotesk', sans-serif",
      border: `1px solid ${T.border}`,
      boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px ${T.accentGlow}`,
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accentSoft, border: `1px solid ${T.accentGlow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic d={icon} size={16} color={T.accent} />
          </div>}
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgElevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSub }}>
          <Ic d={ic.x} size={14} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ─── FORM FIELD ────────────────────────────────────────────────────────────────
const Field = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
    {children}
  </div>
);

// ─── CALENDAR STRIP ────────────────────────────────────────────────────────────
const CalendarStrip = ({ appointments }) => {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selDate, setSelDate] = useState(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i + weekOffset * 7);
    return d;
  });
  const aptCountForDay = day => appointments.filter(a => {
    const ad = new Date(a.date);
    return ad.toDateString() === day.toDateString();
  }).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
          {days[0].toLocaleString('default', { month: 'long' })} {days[0].getFullYear()}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['←', -1], ['→', 1]].map(([arrow, delta]) => (
            <button key={arrow} onClick={() => setWeekOffset(w => w + delta)} style={{
              width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`,
              background: T.bgHover, cursor: 'pointer', color: T.textSub, fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{arrow}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isSel = d.toDateString() === selDate.toDateString();
          const count = aptCountForDay(d);
          return (
            <button key={i} onClick={() => setSelDate(d)} style={{
              flex: 1, padding: '8px 2px', borderRadius: 10, border: `1px solid ${isSel ? T.accent + '40' : 'transparent'}`,
              cursor: 'pointer', background: isSel ? T.accentSoft : isToday ? T.bgHover : 'transparent',
              color: isSel ? T.accent : isToday ? T.text : T.textSub,
              transition: 'all .15s', position: 'relative',
            }}>
              <div style={{ fontSize: 8, marginBottom: 2, opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{d.getDate()}</div>
              {count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3 }}>
                  {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                    <div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: isSel ? T.accent : T.green }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── VITALS MINI CHART ──────────────────────────────────────────────────────────
const VitalsMini = ({ value, unit, normal, label, color }) => {
  const pct = Math.min(100, Math.max(0, (value / (normal * 1.5)) * 100));
  return (
    <div style={{ padding: '10px 12px', background: T.bgElevated, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
        {value} <span style={{ fontSize: 11, color: T.textDim }}>{unit}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

// ─── TASK ITEM ──────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onDelete }) => (
  <div className="row-item" style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
    borderRadius: 10, background: T.bgElevated, marginBottom: 6,
    border: `1px solid ${task.done ? T.border : T.borderLight}`,
    opacity: task.done ? 0.55 : 1, transition: 'all 0.2s',
  }}>
    <button onClick={onToggle} style={{
      width: 20, height: 20, borderRadius: 6, border: `2px solid ${task.done ? T.green : T.border}`,
      background: task.done ? T.green : 'transparent', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {task.done && <Ic d={ic.check} size={11} color={T.bg} sw={3} />}
    </button>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
      {task.due && <div style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{fmtShort(task.due)}</div>}
    </div>
    <Badge color={task.priority === 'High' ? T.red : task.priority === 'Medium' ? T.yellow : T.textDim}>{task.priority}</Badge>
    <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, padding: 2 }}>
      <Ic d={ic.x} size={12} />
    </button>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function DoctorDashboard() {
  const [authUser, setAuthUser] = useState(null);
  const [db, setDB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedPatient, setSelectedPat] = useState(null);
  const [aptFilter, setAptFilter] = useState('all');
  const [patFilter, setPatFilter] = useState('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPri, setNewTaskPri] = useState('Medium');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeThemeName, setActiveThemeName] = useState('Ocean Dark');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [reminderFilter, setReminderFilter] = useState('all');
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Apply active theme to global T object on every render
  const activeTheme = THEMES[activeThemeName] || THEMES['Ocean Dark'];
  Object.assign(T, activeTheme);

  // Forms
  const blankPat = { name: '', age: '', gender: 'Male', contact: '', phone: '', condition: '', notes: '', bloodGroup: '', allergies: '', status: 'Stable' };
  const blankApt = { patientId: '', date: '', time: '', type: 'Consultation', duration: '30', reason: '', status: 'scheduled', notes: '' };
  const blankRx = { patientId: '', medication: '', dosage: '', frequency: '', duration: '', instructions: '', refills: '0' };
  const blankDiag = { patientId: '', diagnosis: '', severity: 'Mild', symptoms: '', tests: '', notes: '', followUp: '' };
  const blankVit = { patientId: '', bp_sys: 120, bp_dia: 80, heartRate: 72, temp: 98.6, weight: '', height: '', oxygen: 98, notes: '' };
  const blankNote = { patientId: '', title: '', content: '', category: 'General', private: false };
  const blankInvoice = { patientId: '', services: [], discount: 0, tax: 0, notes: '', dueDate: '', status: 'Unpaid' };
  const blankReminder = { patientId: '', title: '', message: '', dueDate: '', dueTime: '', type: 'Follow-up', priority: 'Medium', notifyBefore: '30', status: 'active' };

  const [patForm, setPatForm] = useState(blankPat);
  const [aptForm, setAptForm] = useState(blankApt);
  const [rxForm, setRxForm] = useState(blankRx);
  const [diagForm, setDiagForm] = useState(blankDiag);
  const [vitForm, setVitForm] = useState(blankVit);
  const [noteForm, setNoteForm] = useState(blankNote);
  const [invForm, setInvForm] = useState({ ...blankInvoice, services: [{ desc: '', qty: 1, rate: '' }] });
  const [remForm, setRemForm] = useState(blankReminder);
  const [profForm, setProfForm] = useState({});

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Auth + DB Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      let user = null;
      const keys = ['userData', 'user', 'currentUser', 'authUser', 'loggedInUser', 'doctor'];
      for (const key of keys) {
        try { const raw = localStorage.getItem(key); if (raw) { user = JSON.parse(raw); break; } } catch { }
      }
      if (!user && (localStorage.getItem('authToken') || localStorage.getItem('token'))) {
        user = { name: 'Doctor', email: 'doctor@hospital.com' };
      }
      if (!user) { setLoading(false); return; }
      setAuthUser(user);

      let existing = loadDB() || initDB(user);
      // Ensure new fields exist for older saved DBs
      if (!existing.invoices) existing.invoices = [];
      if (!existing.reminders) existing.reminders = [];
      if (!existing.theme) existing.theme = 'Ocean Dark';

      // Fetch from server
      try {
        const res = await fetch('/api/appointments/all');
        if (res.ok) {
          const appointments = await res.json();
          const seenIds = new Set();
          const uniquePatients = [];
          const mappedApts = appointments.map(a => {
            if (a.user && !seenIds.has(a.user._id)) {
              seenIds.add(a.user._id);
              uniquePatients.push({ id: a.user._id, name: a.user.name, contact: a.user.email, status: a.status === 'completed' ? 'Stable' : 'Under Treatment', lastVisit: a.date, condition: a.reason, gender: 'Pending', age: '--', bloodGroup: '', allergies: '' });
            }
            return { id: a._id, patientId: a.user?._id, patientName: a.user?.name || 'Unknown', date: a.date, time: a.time, type: a.specialist, reason: a.reason, status: a.status || 'scheduled', createdAt: new Date(a.createdAt).getTime() };
          });
          existing.appointments = mappedApts;
          existing.patients = uniquePatients;
          const monthly = Array(12).fill(null).map(() => ({ completed: 0, missed: 0, cancelled: 0, scheduled: 0 }));
          mappedApts.forEach(a => {
            const m = new Date(a.date).getMonth();
            if (m >= 0 && m < 12) {
              if (a.status === 'completed') monthly[m].completed++;
              else if (a.status === 'cancelled') monthly[m].cancelled++;
              else if (a.status === 'missed') monthly[m].missed++;
              else monthly[m].scheduled++;
            }
          });
          existing.monthlyData = monthly;
        }
      } catch (err) { console.error("Server fetch failed:", err); }

      setDB(existing);
      saveDB(existing);
      setProfForm({ ...existing.doctor });
      if (existing.theme && THEMES[existing.theme]) setActiveThemeName(existing.theme);
      setLoading(false);
    };
    init();
  }, []);

  const updateDB = useCallback(fn => {
    setDB(prev => { const next = fn(prev); saveDB(next); return next; });
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    ['authToken', 'token', 'userData', 'user', 'currentUser', 'authUser', 'loggedInUser', 'doctor'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const today = todayStr();
  const todayApts = db ? db.appointments.filter(a => a.date === today) : [];
  const upcoming = db ? db.appointments.filter(a => a.date >= today && a.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6) : [];
  const unread = db ? db.notifications.filter(n => !n.read).length : 0;
  const pendingRx = db ? db.prescriptions.filter(r => r.status === 'Active').length : 0;
  const openTasks = db ? db.tasks.filter(t => !t.done).length : 0;
  const unpaidInvoices = db ? (db.invoices || []).filter(i => i.status === 'Unpaid').length : 0;
  const totalRevenue = db ? (db.invoices || []).filter(i => i.status === 'Paid').reduce((s, i) => s + parseFloat(i.total || 0), 0) : 0;
  const activeReminders = db ? (db.reminders || []).filter(r => r.status === 'active').length : 0;
  const overdueReminders = db ? (db.reminders || []).filter(r => r.status === 'active' && r.dueDate && r.dueDate < today).length : 0;

  const avgScore = db && db.activityScores.length > 0
    ? (db.activityScores.reduce((s, v) => s + v, 0) / db.activityScores.length).toFixed(1)
    : '0.0';

  const completionRate = todayApts.length > 0
    ? Math.round((todayApts.filter(a => a.status === 'completed').length / todayApts.length) * 100)
    : 0;

  const filteredPats = db ? db.patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.condition?.toLowerCase().includes(searchQ.toLowerCase());
    const matchFilter = patFilter === 'all' || p.status === patFilter;
    return matchSearch && matchFilter;
  }) : [];

  const filteredApts = db ? db.appointments.filter(a => {
    if (aptFilter === 'all') return true;
    if (aptFilter === 'today') return a.date === today;
    return a.status === aptFilter;
  }) : [];

  // ── Actions ─────────────────────────────────────────────────────────────────
  const addNotif = (type, title, message) => ({
    id: uid(), type, read: false, title, message, ts: Date.now()
  });

  const addPatient = e => {
    e.preventDefault();
    const pat = { id: 'pat_' + uid(), ...patForm, lastVisit: today, createdAt: Date.now() };
    updateDB(d => ({ ...d, patients: [pat, ...d.patients], notifications: [addNotif('patient', 'Patient Registered', pat.name + ' added to your roster'), ...d.notifications] }));
    showToast('Patient added successfully!');
    setPatForm(blankPat); setModal(null);
  };

  const addAppointment = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === aptForm.patientId);
    if (!pat) return;
    const apt = { id: 'apt_' + uid(), ...aptForm, patientName: pat.name, createdAt: Date.now() };
    updateDB(d => ({ ...d, appointments: [apt, ...d.appointments], notifications: [addNotif('appointment', 'Appointment Scheduled', `${pat.name} on ${fmt(aptForm.date)}`), ...d.notifications] }));
    showToast('Appointment scheduled!');
    setAptForm(blankApt); setModal(null);
  };

  const updateAptStatus = async (aptId, status) => {
    updateDB(d => {
      const apt = d.appointments.find(a => a.id === aptId);
      const mo = apt ? new Date(apt.date).getMonth() : new Date().getMonth();
      const md = d.monthlyData.map((m, i) => i !== mo ? m : { ...m, [status]: (m[status] || 0) + 1 });
      const scores = [...d.activityScores];
      if (status === 'completed') scores.push(Math.min(100, 45 + scores.length * 4 + (Math.random() * 15 | 0)));
      return { ...d, appointments: d.appointments.map(a => a.id === aptId ? { ...a, status } : a), monthlyData: md, activityScores: scores.slice(-24) };
    });
    try {
      await fetch(`/api/appointments/${aptId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      showToast(`Appointment marked as ${status}`);
    } catch { showToast('Status updated locally (sync failed)', 'warn'); }
  };

  const addPrescription = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === rxForm.patientId);
    if (!pat) return;
    const rx = { id: 'rx_' + uid(), ...rxForm, patientName: pat.name, date: today, status: 'Active', createdAt: Date.now() };
    updateDB(d => ({ ...d, prescriptions: [rx, ...d.prescriptions], totalPrescriptions: (d.totalPrescriptions || 0) + 1, notifications: [addNotif('prescription', 'Prescription Issued', `${rxForm.medication} for ${pat.name}`), ...d.notifications] }));
    showToast('Prescription issued!');
    setRxForm(blankRx); setModal(null);
  };

  const addDiagnosis = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === diagForm.patientId);
    if (!pat) return;
    const diag = { id: 'diag_' + uid(), ...diagForm, patientName: pat.name, date: today, createdAt: Date.now() };
    updateDB(d => ({ ...d, diagnoses: [diag, ...d.diagnoses], patients: d.patients.map(p => p.id === diagForm.patientId ? { ...p, condition: diagForm.diagnosis, lastVisit: today } : p), notifications: [addNotif('lab', 'Diagnosis Recorded', `${diagForm.diagnosis} for ${pat.name}`), ...d.notifications] }));
    showToast('Diagnosis recorded!');
    setDiagForm(blankDiag); setModal(null);
  };

  const addVitals = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === vitForm.patientId);
    if (!pat) return;
    const vit = { id: 'vit_' + uid(), ...vitForm, patientName: pat.name, date: today, createdAt: Date.now() };
    updateDB(d => ({ ...d, vitals: [vit, ...d.vitals] }));
    showToast('Vitals recorded!');
    setVitForm(blankVit); setModal(null);
  };

  const addNote = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === noteForm.patientId);
    if (!pat) return;
    const note = { id: 'note_' + uid(), ...noteForm, patientName: pat.name, date: today, createdAt: Date.now() };
    updateDB(d => ({ ...d, notes: [note, ...d.notes] }));
    showToast('Note saved!');
    setNoteForm(blankNote); setModal(null);
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const task = { id: 'task_' + uid(), title: newTaskTitle.trim(), priority: newTaskPri, done: false, due: '', createdAt: Date.now() };
    updateDB(d => ({ ...d, tasks: [task, ...d.tasks] }));
    setNewTaskTitle(''); showToast('Task added!');
  };

  const saveProfile = e => {
    e.preventDefault();
    updateDB(d => ({ ...d, doctor: { ...d.doctor, ...profForm } }));
    try { const raw = localStorage.getItem('userData'); if (raw) { const u = JSON.parse(raw); localStorage.setItem('userData', JSON.stringify({ ...u, name: profForm.name })); } } catch { }
    setAuthUser(a => ({ ...a, name: profForm.name }));
    showToast('Profile saved!');
  };

  // ── Theme change ────────────────────────────────────────────────────────────
  const changeTheme = name => {
    setActiveThemeName(name);
    updateDB(d => ({ ...d, theme: name }));
    setShowThemePicker(false);
    showToast(`Theme changed to ${name}`);
  };

  // ── Billing / Invoices ──────────────────────────────────────────────────────
  const addInvoice = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === invForm.patientId);
    if (!pat) return;
    const services = invForm.services.filter(s => s.desc.trim());
    if (!services.length) { showToast('Add at least one service line', 'warn'); return; }
    const subtotal = services.reduce((s, sv) => s + (parseFloat(sv.rate) || 0) * (parseInt(sv.qty) || 1), 0);
    const discountAmt = subtotal * ((parseFloat(invForm.discount) || 0) / 100);
    const taxAmt = (subtotal - discountAmt) * ((parseFloat(invForm.tax) || 0) / 100);
    const total = subtotal - discountAmt + taxAmt;
    const inv = {
      id: 'inv_' + uid(),
      invoiceNo: 'INV-' + (1000 + (db.invoices?.length || 0) + 1),
      patientId: invForm.patientId,
      patientName: pat.name,
      services,
      subtotal: subtotal.toFixed(2),
      discount: invForm.discount,
      tax: invForm.tax,
      discountAmt: discountAmt.toFixed(2),
      taxAmt: taxAmt.toFixed(2),
      total: total.toFixed(2),
      dueDate: invForm.dueDate,
      notes: invForm.notes,
      status: 'Unpaid',
      createdAt: Date.now(),
      date: todayStr(),
    };
    updateDB(d => ({
      ...d,
      invoices: [inv, ...(d.invoices || [])],
      notifications: [addNotif('billing', 'Invoice Created', `${inv.invoiceNo} · $${inv.total} for ${pat.name}`), ...d.notifications],
    }));
    showToast(`Invoice ${inv.invoiceNo} created!`);
    setInvForm({ ...blankInvoice, services: [{ desc: '', qty: 1, rate: '' }] });
    setModal(null);
  };

  const updateInvoiceStatus = (invId, status) => {
    updateDB(d => ({ ...d, invoices: (d.invoices || []).map(i => i.id === invId ? { ...i, status } : i) }));
    showToast(`Invoice marked as ${status}`);
  };

  // ── Reminders ───────────────────────────────────────────────────────────────
  const addReminder = e => {
    e.preventDefault();
    const pat = db.patients.find(p => p.id === remForm.patientId);
    if (!pat) return;
    const rem = {
      id: 'rem_' + uid(),
      ...remForm,
      patientName: pat.name,
      status: 'active',
      createdAt: Date.now(),
      triggered: false,
    };
    updateDB(d => ({
      ...d,
      reminders: [rem, ...(d.reminders || [])],
      notifications: [addNotif('reminder', 'Reminder Set', `${rem.title} for ${pat.name} on ${fmt(rem.dueDate)}`), ...d.notifications],
    }));
    showToast('Reminder set!');
    setRemForm(blankReminder);
    setModal(null);
  };

  const dismissReminder = remId => {
    updateDB(d => ({ ...d, reminders: (d.reminders || []).map(r => r.id === remId ? { ...r, status: 'dismissed' } : r) }));
    showToast('Reminder dismissed');
  };

  const snoozeReminder = remId => {
    updateDB(d => ({
      ...d,
      reminders: (d.reminders || []).map(r => {
        if (r.id !== remId) return r;
        const newDate = new Date(r.dueDate);
        newDate.setDate(newDate.getDate() + 1);
        return { ...r, dueDate: newDate.toISOString().split('T')[0], status: 'snoozed' };
      }),
    }));
    showToast('Snoozed by 1 day');
  };

  // ─── SHARED STYLES ──────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 13px',
    borderRadius: 9, border: `1.5px solid ${T.border}`,
    outline: 'none', fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 13, background: T.bgElevated, color: T.text,
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: T.textSub,
    marginBottom: 5, display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };
  const btnPrimary = {
    width: '100%', padding: '11px', borderRadius: 11, border: 'none',
    background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
    color: T.bg, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
    boxShadow: `0 4px 16px ${T.accent}30`,
    transition: 'all 0.2s',
  };
  const inputBtnPrimary = { ...btnPrimary, width: 'auto', padding: '9px 18px' };
  const card = {
    background: T.bgCard, borderRadius: 16,
    border: `1px solid ${T.border}`, padding: '18px',
    marginBottom: 14, transition: 'all 0.2s',
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: ic.dash, badge: null },
    { id: 'appointments', label: 'Appointments', icon: ic.cal, badge: todayApts.filter(a => a.status === 'scheduled').length || null },
    { id: 'patients', label: 'Patients', icon: ic.usr, badge: db?.patients.length || null },
    { id: 'prescriptions', label: 'Prescriptions', icon: ic.pill, badge: pendingRx || null },
    { id: 'diagnoses', label: 'Diagnoses', icon: ic.flask, badge: null },
    { id: 'vitals', label: 'Vitals', icon: ic.activity, badge: null },
    { id: 'notes', label: 'Clinical Notes', icon: ic.notes, badge: null },
    { id: 'billing', label: 'Billing', icon: ic.dollar, badge: unpaidInvoices || null },
    { id: 'reminders', label: 'Reminders', icon: ic.reminder, badge: overdueReminders || null },
    { id: 'tasks', label: 'Tasks', icon: ic.clip, badge: openTasks || null },
    { id: 'analytics', label: 'Analytics', icon: ic.trend, badge: null },
    { id: 'records', label: 'Records', icon: ic.rec, badge: null },
  ];

  // ─────────────────────────── LOADING SCREEN ──────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: "'Space Grotesk',sans-serif" }}>
      <style>{makeGlobalCSS(activeTheme)}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: T.accent, fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.08em' }}>MEDIPREDICT</div>
        <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>Loading dashboard…</div>
      </div>
    </div>
  );

  // ───────────────────────── NO AUTH SCREEN ────────────────────────────────
  if (!authUser || !db) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: "'Space Grotesk',sans-serif", padding: 20 }}>
      <style>{makeGlobalCSS(activeTheme)}</style>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏥</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>MediPredict</div>
        <p style={{ color: T.textSub, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>Sign in to access your doctor dashboard.</p>
        <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Demo Access</div>
          <input placeholder="Your name (e.g. Dr. Jane Smith)" id="dn" style={{ ...inputStyle, marginBottom: 8 }} />
          <input placeholder="Email" id="de" style={{ ...inputStyle, marginBottom: 14 }} />
          <button className="btn-primary" style={btnPrimary} onClick={() => {
            const name = document.getElementById('dn').value || 'Dr. Demo';
            const email = document.getElementById('de').value || 'demo@medipredict.com';
            localStorage.setItem('userData', JSON.stringify({ name, email }));
            localStorage.setItem('authToken', 'demo_' + uid());
            window.location.reload();
          }}>Enter Dashboard</button>
        </div>
        <button onClick={() => window.location.href = '/login'} style={{ marginTop: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: T.textSub, fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }}>
          Go to Login Page →
        </button>
      </div>
    </div>
  );

  const doctor = db.doctor;
  const firstName = doctor.name.split(' ').find(w => !/^dr\.?$/i.test(w)) || doctor.name;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE RENDERERS
  // ════════════════════════════════════════════════════════════════════════════

  const renderDashboard = () => {
    const totalApts = db.appointments.length;
    const completedApts = db.appointments.filter(a => a.status === 'completed').length;
    const overallRate = totalApts > 0 ? Math.round((completedApts / totalApts) * 100) : 0;

    const donutSegs = [
      { value: completedApts, color: T.green, label: 'Completed' },
      { value: db.appointments.filter(a => a.status === 'cancelled').length, color: T.red, label: 'Cancelled' },
      { value: db.appointments.filter(a => a.status === 'missed').length, color: T.textDim, label: 'Missed' },
      { value: db.appointments.filter(a => a.status === 'scheduled').length, color: T.accent, label: 'Scheduled' },
    ].filter(s => s.value > 0);

    return (
      <div className="fade-in">
        {/* Hero Banner */}
        <div style={{ borderRadius: 18, background: `linear-gradient(135deg, #0E1E2E 0%, #0A1628 50%, #091220 100%)`, padding: '22px 24px', marginBottom: 16, border: `1px solid ${T.borderLight}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${T.accent}12 0%, transparent 70%)` }} />
          <div style={{ position: 'absolute', bottom: -20, left: 100, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${T.green}08 0%, transparent 70%)` }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                ● LIVE DASHBOARD
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                Welcome, Dr. {firstName}
              </div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 16 }}>
                {todayApts.filter(a => a.status === 'scheduled').length > 0
                  ? `${todayApts.filter(a => a.status === 'scheduled').length} appointment(s) pending today`
                  : 'All clear for today — no pending appointments'}
              </div>

              {/* Today's progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, maxWidth: 240 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: T.textSub }}>
                    <span>Today's Progress</span>
                    <span style={{ color: T.accent, fontFamily: "'JetBrains Mono', monospace" }}>{completionRate}%</span>
                  </div>
                  <div style={{ height: 5, background: T.border, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${completionRate}%`, height: '100%', background: `linear-gradient(90deg, ${T.green}, ${T.accent})`, borderRadius: 5, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${T.accent}50` }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.textSub }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>{todayApts.filter(a => a.status === 'completed').length}</span>/{todayApts.length} done
                </div>
              </div>
            </div>

            {/* Quick stats row */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              {[
                { val: db.patients.length, label: 'Patients', color: T.blue },
                { val: totalApts, label: 'Total Apts', color: T.accent },
                { val: `${overallRate}%`, label: 'Complete', color: T.green },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${T.borderLight}`, minWidth: 80 }}>
                  <div className="count-anim" style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          {[
            { label: "Today's Appointments", val: todayApts.length, icon: ic.cal, color: T.accent, tab: 'appointments' },
            { label: 'Active Prescriptions', val: pendingRx, icon: ic.pill, color: T.green, tab: 'prescriptions' },
            { label: 'Unpaid Invoices', val: unpaidInvoices, icon: ic.invoice, color: T.yellow, tab: 'billing' },
            { label: 'Active Reminders', val: activeReminders, icon: ic.reminder, color: overdueReminders > 0 ? T.red : T.purple, tab: 'reminders' },
          ].map((s, i) => (
            <div key={i} className="card-hover stat-card" style={{ ...card, marginBottom: 0, padding: '15px', cursor: 'pointer' }} onClick={() => setActiveTab(s.tab)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic d={s.icon} size={15} color={s.color} />
                </div>
                <Ic d={ic.chR} size={13} color={T.textDim} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 4 }}>{s.label}</div>
              {i === 3 && overdueReminders > 0 && <div style={{ fontSize: 10, color: T.red, marginTop: 3, fontWeight: 700 }}>⚠ {overdueReminders} overdue</div>}
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, marginBottom: 14 }}>
          {/* Sparkline */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Practice Activity Score</div>
                <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>Based on appointment completion</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: "'JetBrains Mono', monospace" }}>{avgScore}</div>
                <Badge color={parseFloat(avgScore) >= 70 ? T.green : T.yellow}>{parseFloat(avgScore) >= 70 ? 'Excellent' : 'Growing'}</Badge>
              </div>
            </div>
            <SparkLine data={db.activityScores} />
          </div>

          {/* Donut */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Appointment Mix</div>
            {donutSegs.length > 0 ? (
              <>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <DonutChart segments={donutSegs} size={110} />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{totalApts}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                  {donutSegs.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ color: T.textSub, flex: 1, textAlign: 'left' }}>{s.label}</span>
                      <span style={{ color: T.text, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: T.textDim, fontSize: 12 }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Monthly Bar + Today's Schedule */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Monthly Breakdown</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Completed', T.green], ['Missed', T.textDim], ['Cancelled', T.yellow]].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                    <span style={{ fontSize: 9, color: T.textDim }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <BarChart data={db.monthlyData} />
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Today's Schedule</div>
              <button onClick={() => setActiveTab('appointments')} style={{ fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                View All →
              </button>
            </div>
            {todayApts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: T.textDim, fontSize: 12 }}>No appointments today</div>
            ) : (
              todayApts.slice(0, 5).map(a => (
                <div key={a.id} className="row-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 9, marginBottom: 5, cursor: 'pointer' }}>
                  <Avatar name={a.patientName} size={34} radius={9} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patientName}</div>
                    <div style={{ fontSize: 10.5, color: T.textSub }}>{a.type} · {a.time}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Appointments</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{db.appointments.length} total · {todayApts.length} today</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModal({ type: 'apt' })} disabled={db.patients.length === 0} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6, opacity: db.patients.length === 0 ? 0.5 : 1 }}>
            <Ic d={ic.plus} size={14} color={T.bg} /> New Appointment
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: T.bgCard, padding: '4px', borderRadius: 12, border: `1px solid ${T.border}`, width: 'fit-content' }}>
        {['all', 'today', 'scheduled', 'completed', 'missed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setAptFilter(f)} style={{
            padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: aptFilter === f ? T.bgElevated : 'transparent',
            color: aptFilter === f ? T.text : T.textDim,
            fontSize: 12, fontWeight: aptFilter === f ? 700 : 500,
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: aptFilter === f ? `0 1px 4px rgba(0,0,0,0.3)` : 'none',
            transition: 'all 0.15s', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      <div style={card}>
        {filteredApts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: T.textDim, fontSize: 13 }}>
            No appointments found for this filter
          </div>
        ) : filteredApts.map(a => (
          <div key={a.id} className="row-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 11, marginBottom: 6, border: `1px solid ${T.bgElevated}`, background: T.bgElevated, transition: 'all 0.15s' }}>
            <Avatar name={a.patientName} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{a.patientName}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 1 }}>{a.type} · {fmt(a.date)} {a.time && `· ${a.time}`}</div>
              {a.reason && <div style={{ fontSize: 11, color: T.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <StatusBadge status={a.status} />
              {a.status === 'scheduled' && (
                <>
                  <button onClick={() => updateAptStatus(a.id, 'completed')} className="tooltip-wrap" style={{ padding: '5px 10px', borderRadius: 8, background: T.greenBg, border: `1px solid ${T.green}30`, cursor: 'pointer', color: T.green, fontSize: 12, fontWeight: 700 }}>
                    ✓<span className="tooltip">Mark Complete</span>
                  </button>
                  <button onClick={() => updateAptStatus(a.id, 'missed')} className="tooltip-wrap" style={{ padding: '5px 10px', borderRadius: 8, background: T.bgHover, border: `1px solid ${T.border}`, cursor: 'pointer', color: T.textSub, fontSize: 12, fontWeight: 700 }}>
                    –<span className="tooltip">Mark Missed</span>
                  </button>
                  <button onClick={() => updateAptStatus(a.id, 'cancelled')} className="tooltip-wrap" style={{ padding: '5px 10px', borderRadius: 8, background: T.redBg, border: `1px solid ${T.red}30`, cursor: 'pointer', color: T.red, fontSize: 12, fontWeight: 700 }}>
                    ✕<span className="tooltip">Cancel</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Patient Roster</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{db.patients.length} registered patients</div>
        </div>
        <button onClick={() => setModal({ type: 'patient' })} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={ic.plus} size={14} color={T.bg} /> Add Patient
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: T.bgCard, border: `1.5px solid ${T.border}`, borderRadius: 11, padding: '9px 14px' }}>
          <Ic d={ic.search} size={14} color={T.textDim} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search patients by name, condition..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.text, width: '100%', fontFamily: "'Space Grotesk', sans-serif" }} />
        </div>
        <select value={patFilter} onChange={e => setPatFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="all">All Status</option>
          <option value="Stable">Stable</option>
          <option value="Under Treatment">In Treatment</option>
          <option value="Improving">Improving</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      <div style={card}>
        {filteredPats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>
            {db.patients.length === 0 ? 'No patients yet — add your first patient!' : 'No results found'}
          </div>
        ) : filteredPats.map(p => {
          const patApts = db.appointments.filter(a => a.patientId === p.id);
          const patRx = db.prescriptions.filter(r => r.patientId === p.id && r.status === 'Active');
          return (
            <div key={p.id} className="row-item" onClick={() => setSelectedPat(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 12, marginBottom: 8, background: T.bgElevated, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <Avatar name={p.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.textSub, marginTop: 1 }}>
                  {p.age && `${p.age}y`}{p.age && p.gender ? ' · ' : ''}{p.gender} {p.bloodGroup ? `· ${p.bloodGroup}` : ''}
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{p.condition}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {patApts.length > 0 && <Badge color={T.accent}>{patApts.length} apts</Badge>}
                {patRx.length > 0 && <Badge color={T.green}>{patRx.length} Rx</Badge>}
                <StatusBadge status={p.status} />
                <Ic d={ic.chR} size={14} color={T.textDim} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (() => {
        const patApts = db.appointments.filter(a => a.patientId === selectedPatient.id);
        const patRx = db.prescriptions.filter(r => r.patientId === selectedPatient.id);
        const patDiags = db.diagnoses.filter(d => d.patientId === selectedPatient.id);
        const patVits = db.vitals.filter(v => v.patientId === selectedPatient.id);
        const patNotes = db.notes.filter(n => n.patientId === selectedPatient.id);
        return (
          <Modal title={selectedPatient.name} onClose={() => setSelectedPat(null)} width={600} icon={ic.usr}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}` }}>
              <Avatar name={selectedPatient.name} size={54} radius={13} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{selectedPatient.name}</div>
                <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{selectedPatient.condition}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                  <StatusBadge status={selectedPatient.status} />
                  {selectedPatient.bloodGroup && <Badge color={T.red}>{selectedPatient.bloodGroup}</Badge>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: T.textDim }}>Last Visit</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtShort(selectedPatient.lastVisit)}</div>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Appointments', val: patApts.length, color: T.accent },
                { label: 'Prescriptions', val: patRx.length, color: T.green },
                { label: 'Diagnoses', val: patDiags.length, color: T.yellow },
                { label: 'Vitals', val: patVits.length, color: T.purple },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px', background: T.bg, borderRadius: 10, textAlign: 'center', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: T.textDim }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[['Age', selectedPatient.age], ['Gender', selectedPatient.gender], ['Phone', selectedPatient.phone], ['Email', selectedPatient.contact], ['Blood Group', selectedPatient.bloodGroup], ['Allergies', selectedPatient.allergies]].map(([k, v]) => v ? (
                <div key={k} style={{ padding: '9px 12px', background: T.bg, borderRadius: 9, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 10, color: T.textDim, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v}</div>
                </div>
              ) : null)}
            </div>

            {/* Recent Rx */}
            {patRx.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ic d={ic.pill} size={13} color={T.green} /> Active Prescriptions
                </div>
                {patRx.filter(r => r.status === 'Active').slice(0, 3).map(r => (
                  <div key={r.id} style={{ padding: '9px 12px', background: T.bg, borderRadius: 9, marginBottom: 5, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{r.medication}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{r.dosage} · {r.frequency} · {r.duration}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Diags */}
            {patDiags.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ic d={ic.flask} size={13} color={T.yellow} /> Diagnoses
                </div>
                {patDiags.slice(0, 3).map(d => (
                  <div key={d.id} style={{ padding: '9px 12px', background: T.bg, borderRadius: 9, marginBottom: 5, border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{d.diagnosis}</div>
                    <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{d.severity} · {fmtShort(d.date)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Latest Vitals */}
            {patVits.length > 0 && (() => {
              const v = patVits[0];
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Ic d={ic.activity} size={13} color={T.accent} /> Latest Vitals — {fmtShort(v.date)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <VitalsMini value={`${v.bp_sys}/${v.bp_dia}`} unit="mmHg" label="Blood Pressure" color={T.red} normal={120} />
                    <VitalsMini value={v.heartRate} unit="bpm" label="Heart Rate" color={T.accent} normal={80} />
                    <VitalsMini value={v.oxygen} unit="%" label="SpO₂" color={T.green} normal={100} />
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            {patNotes.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ic d={ic.notes} size={13} color={T.purple} /> Clinical Notes
                </div>
                {patNotes.slice(0, 2).map(n => (
                  <div key={n.id} style={{ padding: '9px 12px', background: T.bg, borderRadius: 9, marginBottom: 5, border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: T.textSub, marginTop: 2, lineHeight: 1.5 }}>{n.content?.slice(0, 120)}{n.content?.length > 120 ? '...' : ''}</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>{fmtShort(n.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );

  const renderPrescriptions = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Prescriptions</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{pendingRx} active · {db.prescriptions.length} total</div>
        </div>
        <button onClick={() => db.patients.length > 0 ? setModal({ type: 'rx' }) : showToast('Add a patient first!', 'warn')} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={ic.plus} size={14} color={T.bg} /> Issue Prescription
        </button>
      </div>
      <div style={card}>
        {db.prescriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>No prescriptions issued yet</div>
        ) : db.prescriptions.map(rx => (
          <div key={rx.id} style={{ padding: '13px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={rx.patientName} size={36} radius={9} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{rx.patientName}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{fmt(rx.date)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <StatusBadge status={rx.status} />
                {rx.status === 'Active' && (
                  <button onClick={() => updateDB(d => ({ ...d, prescriptions: d.prescriptions.map(r => r.id === rx.id ? { ...r, status: 'Completed' } : r) }))}
                    style={{ padding: '4px 10px', borderRadius: 8, background: T.bgHover, border: `1px solid ${T.border}`, cursor: 'pointer', color: T.textSub, fontSize: 11, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Mark Done</button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[['Medication', rx.medication], ['Dosage', rx.dosage], ['Frequency', rx.frequency], ['Duration', rx.duration]].map(([k, v]) => (
                <div key={k} style={{ padding: '8px 10px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{v}</div>
                </div>
              ))}
            </div>
            {rx.instructions && <div style={{ marginTop: 8, fontSize: 11.5, color: T.textSub, fontStyle: 'italic', padding: '6px 10px', background: `${T.accent}06`, borderRadius: 7, border: `1px solid ${T.accentGlow}` }}>ℹ {rx.instructions}</div>}
            {rx.refills && rx.refills > 0 && <div style={{ marginTop: 4, fontSize: 10, color: T.textDim }}>Refills: {rx.refills}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderDiagnoses = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Diagnoses & Lab Results</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{db.diagnoses.length} records</div>
        </div>
        <button onClick={() => db.patients.length > 0 ? setModal({ type: 'diag' }) : showToast('Add a patient first!', 'warn')} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={ic.plus} size={14} color={T.bg} /> Record Diagnosis
        </button>
      </div>
      <div style={card}>
        {db.diagnoses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>No diagnoses recorded</div>
        ) : db.diagnoses.map(d => {
          const sevColor = d.severity === 'Mild' ? T.green : d.severity === 'Moderate' ? T.yellow : T.red;
          return (
            <div key={d.id} style={{ padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 8, borderLeft: `3px solid ${sevColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar name={d.patientName} size={36} radius={9} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{d.patientName}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.text, marginTop: 1 }}>{d.diagnosis}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge color={sevColor}>{d.severity}</Badge>
                  <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{fmtShort(d.date)}</span>
                </div>
              </div>
              {d.symptoms && <div style={{ fontSize: 11.5, color: T.textSub, marginBottom: 4 }}><span style={{ fontWeight: 600, color: T.textSub }}>Symptoms:</span> {d.symptoms}</div>}
              {d.tests && <div style={{ fontSize: 11.5, color: T.textSub, marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Tests:</span> {d.tests}</div>}
              {d.notes && <div style={{ fontSize: 11, color: T.textDim, fontStyle: 'italic' }}>{d.notes}</div>}
              {d.followUp && <div style={{ marginTop: 6, fontSize: 10.5, color: T.accent, fontFamily: "'JetBrains Mono', monospace" }}>↻ Follow-up: {d.followUp}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderVitals = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Patient Vitals</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{db.vitals.length} records</div>
        </div>
        <button onClick={() => db.patients.length > 0 ? setModal({ type: 'vitals' }) : showToast('Add a patient first!', 'warn')} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={ic.plus} size={14} color={T.bg} /> Record Vitals
        </button>
      </div>
      <div style={card}>
        {db.vitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>No vitals recorded yet</div>
        ) : db.vitals.map(v => (
          <div key={v.id} style={{ marginBottom: 14, padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar name={v.patientName} size={36} radius={9} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{v.patientName}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{fmt(v.date)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <VitalsMini value={`${v.bp_sys}/${v.bp_dia}`} unit="mmHg" label="Blood Pressure" color={T.red} normal={120} />
              <VitalsMini value={v.heartRate} unit="bpm" label="Heart Rate" color={T.accent} normal={80} />
              <VitalsMini value={`${v.temp}°`} unit="F" label="Temperature" color={T.yellow} normal={99} />
              <VitalsMini value={v.oxygen} unit="%" label="Oxygen Sat." color={T.green} normal={100} />
              {v.weight && <VitalsMini value={v.weight} unit="kg" label="Weight" color={T.purple} normal={80} />}
              {v.height && <VitalsMini value={v.height} unit="cm" label="Height" color={T.blue} normal={175} />}
            </div>
            {v.notes && <div style={{ marginTop: 10, fontSize: 11.5, color: T.textSub, fontStyle: 'italic', padding: '7px 11px', background: `${T.accent}06`, borderRadius: 8, border: `1px solid ${T.accentGlow}` }}>{v.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Clinical Notes</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{db.notes.length} notes</div>
        </div>
        <button onClick={() => db.patients.length > 0 ? setModal({ type: 'note' }) : showToast('Add a patient first!', 'warn')} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic d={ic.plus} size={14} color={T.bg} /> New Note
        </button>
      </div>
      <div style={card}>
        {db.notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>No clinical notes yet</div>
        ) : db.notes.map(n => (
          <div key={n.id} style={{ padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 8, borderTop: `3px solid ${T.purple}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar name={n.patientName} size={34} radius={9} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: T.textSub }}>{n.patientName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge color={T.purple}>{n.category}</Badge>
                {n.private && <Badge color={T.red}>Private</Badge>}
                <span style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{fmtShort(n.date)}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Task Manager</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{openTasks} open · {db.tasks.filter(t => t.done).length} done</div>
        </div>
      </div>

      {/* Add task inline */}
      <div style={{ ...card, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task and press Enter…" style={{ ...inputStyle, flex: 1 }} />
        <select value={newTaskPri} onChange={e => setNewTaskPri(e.target.value)} style={{ ...inputStyle, width: 120 }}>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
        <button onClick={addTask} className="btn-primary" style={{ ...btnPrimary, width: 'auto', padding: '9px 16px' }}>Add</button>
      </div>

      <div style={card}>
        {db.tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.textDim, fontSize: 13 }}>No tasks yet</div>
        ) : (
          <>
            {db.tasks.filter(t => !t.done).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Open</div>
                {db.tasks.filter(t => !t.done).map(task => (
                  <TaskItem key={task.id} task={task}
                    onToggle={() => updateDB(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t) }))}
                    onDelete={() => updateDB(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))}
                  />
                ))}
              </>
            )}
            {db.tasks.filter(t => t.done).length > 0 && (
              <>
                <Divider />
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Completed</div>
                {db.tasks.filter(t => t.done).slice(0, 5).map(task => (
                  <TaskItem key={task.id} task={task}
                    onToggle={() => updateDB(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t) }))}
                    onDelete={() => updateDB(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    const totalApts = db.appointments.length;
    const completedApts = db.appointments.filter(a => a.status === 'completed').length;
    const cancelledApts = db.appointments.filter(a => a.status === 'cancelled').length;
    const missedApts = db.appointments.filter(a => a.status === 'missed').length;
    const rate = totalApts > 0 ? ((completedApts / totalApts) * 100).toFixed(1) : 0;
    const cancelRate = totalApts > 0 ? ((cancelledApts / totalApts) * 100).toFixed(1) : 0;

    // Top conditions
    const conditionMap = {};
    db.diagnoses.forEach(d => { conditionMap[d.diagnosis] = (conditionMap[d.diagnosis] || 0) + 1; });
    const topConditions = Object.entries(conditionMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Apt type breakdown
    const typeMap = {};
    db.appointments.forEach(a => { typeMap[a.type] = (typeMap[a.type] || 0) + 1; });
    const topTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
      <div className="fade-in">
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 16 }}>Analytics</div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Completion Rate', val: `${rate}%`, color: T.green, icon: ic.check },
            { label: 'Cancellation Rate', val: `${cancelRate}%`, color: T.red, icon: ic.x },
            { label: 'Avg. Score', val: `${avgScore}%`, color: T.accent, icon: ic.star },
            { label: 'Active Patients', val: db.patients.filter(p => p.status === 'Under Treatment').length, color: T.yellow, icon: ic.usr },
          ].map((s, i) => (
            <div key={i} style={{ ...card, marginBottom: 0, padding: '15px', textAlign: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Ic d={s.icon} size={16} color={s.color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Top Conditions */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Top Diagnoses</div>
            {topConditions.length === 0 ? (
              <div style={{ color: T.textDim, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No diagnoses yet</div>
            ) : topConditions.map(([cond, count], i) => {
              const pct = topConditions[0][1] > 0 ? (count / topConditions[0][1]) * 100 : 0;
              return (
                <div key={cond} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: T.text, fontWeight: 600 }}>{cond}</span>
                    <span style={{ color: T.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: T.border, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], borderRadius: 5, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Appointment Types */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Appointment Types</div>
            {topTypes.length === 0 ? (
              <div style={{ color: T.textDim, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No appointments yet</div>
            ) : topTypes.map(([type, count], i) => {
              const pct = topTypes[0][1] > 0 ? (count / topTypes[0][1]) * 100 : 0;
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: T.text, fontWeight: 600 }}>{type || 'General'}</span>
                    <span style={{ color: T.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: T.border, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length], borderRadius: 5 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Score over time */}
          <div style={{ ...card, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Activity Score Trend</div>
              <Badge color={T.accent}>{db.activityScores.length} data points</Badge>
            </div>
            <SparkLine data={db.activityScores} height={100} />
          </div>
        </div>
      </div>
    );
  };

  const renderRecords = () => (
    <div className="fade-in">
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 16 }}>Health Records</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total Patients', val: db.patients.length, icon: '👥', color: T.blue },
          { label: 'Total Appointments', val: db.appointments.length, icon: '📅', color: T.accent },
          { label: 'Prescriptions Issued', val: db.totalPrescriptions || 0, icon: '💊', color: T.green },
          { label: 'Diagnoses Recorded', val: db.diagnoses.length, icon: '🔬', color: T.yellow },
          { label: 'Vitals Recorded', val: db.vitals.length, icon: '❤️', color: T.red },
          { label: 'Clinical Notes', val: db.notes.length, icon: '📝', color: T.purple },
        ].map(s => (
          <div key={s.label} style={{ ...card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: T.textSub }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Recent Activity</div>
        {[...db.appointments, ...db.prescriptions, ...db.diagnoses, ...db.vitals, ...db.notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15).map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bgElevated, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
              {item.medication ? '💊' : item.diagnosis ? '🔬' : item.bp_sys ? '❤️' : item.title && item.content ? '📝' : '📅'}
            </div>
            <Avatar name={item.patientName} size={30} radius={8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.patientName}</div>
              <div style={{ fontSize: 11, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.medication ? `Rx: ${item.medication} ${item.dosage}` : item.diagnosis ? `Dx: ${item.diagnosis}` : item.bp_sys ? `BP: ${item.bp_sys}/${item.bp_dia} mmHg · HR: ${item.heartRate}` : item.title ? `Note: ${item.title}` : `Apt: ${item.type || ''}`}
              </div>
            </div>
            <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{fmtShort(new Date(item.createdAt))}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="fade-in">
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 16 }}>Profile Settings</div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, padding: '16px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}` }}>
          <Avatar name={doctor.name} size={60} radius={14} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{doctor.name}</div>
            <div style={{ fontSize: 13, color: T.textSub }}>{doctor.specialty}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Badge color={T.green}>● Active</Badge>
              {doctor.license && <Badge color={T.yellow}>{doctor.license}</Badge>}
            </div>
          </div>
        </div>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['name', 'Full Name', 'Dr. Jane Smith'], ['email', 'Email', 'doctor@hospital.com'], ['specialty', 'Specialty', 'General Physician'], ['license', 'License No.', 'MD-123456'], ['experience', 'Years of Experience', '10 years'], ['phone', 'Phone', '+1 000-000-0000'], ['hospital', 'Hospital / Clinic', 'City Medical Center']].map(([k, l, ph]) => (
              <div key={k}>
                <label style={labelStyle}>{l}</label>
                <input value={profForm[k] || ''} onChange={e => setProfForm({ ...profForm, [k]: e.target.value })} placeholder={ph} style={inputStyle} type={k === 'email' ? 'email' : 'text'} />
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Bio / About</label>
              <textarea value={profForm.bio || ''} onChange={e => setProfForm({ ...profForm, bio: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} placeholder="Short bio or professional summary…" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Save Profile</button></div>
        </form>
      </div>

      <div style={{ ...card, border: `1px solid ${T.red}25` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 6 }}>Danger Zone</div>
        <p style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>Permanently clear all dashboard data. This cannot be undone.</p>
        <button onClick={() => { if (window.confirm('Delete ALL data? This cannot be undone.')) { const fresh = initDB(authUser); saveDB(fresh); setDB(fresh); setProfForm({ ...fresh.doctor }); showToast('All data cleared', 'warn'); } }}
          style={{ padding: '8px 16px', borderRadius: 9, border: `1px solid ${T.red}50`, background: T.redBg, color: T.red, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
          Clear All Data
        </button>
      </div>
    </div>
  );

  // ── Billing Page ────────────────────────────────────────────────────────────
  const renderBilling = () => {
    const invoices = db.invoices || [];
    const filtered = invoices.filter(i => invoiceFilter === 'all' || i.status === invoiceFilter);
    const paidTotal = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const unpaidTotal = invoices.filter(i => i.status === 'Unpaid').reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const overdueCount = invoices.filter(i => i.status === 'Unpaid' && i.dueDate && i.dueDate < today).length;

    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Billing & Invoices</div>
            <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{invoices.length} invoices · ${paidTotal.toFixed(2)} collected</div>
          </div>
          <button onClick={() => db.patients.length > 0 ? setModal({ type: 'invoice' }) : showToast('Add a patient first!', 'warn')}
            className="btn-primary" style={{ ...inputBtnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic d={ic.plus} size={14} color={T.bg} /> New Invoice
          </button>
        </div>

        {/* Revenue KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Total Collected', val: `$${paidTotal.toFixed(0)}`, color: T.green, icon: ic.dollar },
            { label: 'Outstanding', val: `$${unpaidTotal.toFixed(0)}`, color: T.yellow, icon: ic.creditCard },
            { label: 'Overdue', val: overdueCount, color: T.red, icon: ic.alarm },
            { label: 'Total Invoices', val: invoices.length, color: T.accent, icon: ic.invoice },
          ].map((s, i) => (
            <div key={i} className="card-hover stat-card" style={{ ...card, marginBottom: 0, padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic d={s.icon} size={15} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: T.textSub, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: T.bgCard, padding: '4px', borderRadius: 12, border: `1px solid ${T.border}`, width: 'fit-content' }}>
          {['all', 'Unpaid', 'Paid', 'Overdue', 'Cancelled'].map(f => (
            <button key={f} onClick={() => setInvoiceFilter(f)} style={{
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: invoiceFilter === f ? T.bgElevated : 'transparent',
              color: invoiceFilter === f ? T.text : T.textDim,
              fontSize: 12, fontWeight: invoiceFilter === f ? 700 : 500,
              fontFamily: "'Space Grotesk',sans-serif", transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>

        <div style={card}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>
              {invoices.length === 0 ? 'No invoices yet — create your first invoice!' : 'No invoices match this filter'}
            </div>
          ) : filtered.map(inv => {
            const isOverdue = inv.status === 'Unpaid' && inv.dueDate && inv.dueDate < today;
            const statusColor = inv.status === 'Paid' ? T.green : isOverdue ? T.red : inv.status === 'Cancelled' ? T.textDim : T.yellow;
            return (
              <div key={inv.id} style={{ padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${isOverdue ? T.red + '40' : T.border}`, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar name={inv.patientName} size={38} radius={9} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{inv.patientName}</div>
                      <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{inv.invoiceNo} · {fmt(inv.date)}</div>
                      {inv.dueDate && <div style={{ fontSize: 10, color: isOverdue ? T.red : T.textDim }}>Due: {fmt(inv.dueDate)}{isOverdue ? ' — OVERDUE' : ''}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>${inv.total}</div>
                    <Badge color={statusColor}>{isOverdue ? 'Overdue' : inv.status}</Badge>
                  </div>
                </div>

                {/* Services breakdown */}
                <div style={{ marginBottom: 10 }}>
                  {inv.services.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${T.border}`, color: T.textSub }}>
                      <span>{s.desc}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{s.qty} × ${parseFloat(s.rate || 0).toFixed(2)} = <strong style={{ color: T.text }}>${((parseFloat(s.rate) || 0) * (parseInt(s.qty) || 1)).toFixed(2)}</strong></span>
                    </div>
                  ))}
                  {(parseFloat(inv.discount) > 0 || parseFloat(inv.tax) > 0) && (
                    <div style={{ paddingTop: 6 }}>
                      {parseFloat(inv.discount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.green }}><span>Discount ({inv.discount}%)</span><span>−${inv.discountAmt}</span></div>}
                      {parseFloat(inv.tax) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textSub }}><span>Tax ({inv.tax}%)</span><span>+${inv.taxAmt}</span></div>}
                    </div>
                  )}
                </div>

                {inv.notes && <div style={{ fontSize: 11.5, color: T.textSub, fontStyle: 'italic', marginBottom: 8 }}>{inv.notes}</div>}

                <div style={{ display: 'flex', gap: 6 }}>
                  {inv.status === 'Unpaid' && (
                    <button onClick={() => updateInvoiceStatus(inv.id, 'Paid')} style={{ padding: '5px 12px', borderRadius: 8, background: T.greenBg, border: `1px solid ${T.green}30`, cursor: 'pointer', color: T.green, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                      ✓ Mark Paid
                    </button>
                  )}
                  {inv.status !== 'Cancelled' && (
                    <button onClick={() => updateInvoiceStatus(inv.id, 'Cancelled')} style={{ padding: '5px 12px', borderRadius: 8, background: T.redBg, border: `1px solid ${T.red}30`, cursor: 'pointer', color: T.red, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                      Cancel
                    </button>
                  )}
                  {inv.status === 'Paid' && (
                    <button onClick={() => {
                      // Simple print-friendly view
                      const w = window.open('', '_blank', 'width=700,height=800');
                      w.document.write(`<html><head><title>${inv.invoiceNo}</title><style>body{font-family:sans-serif;padding:40px;color:#111}h1{font-size:24px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}.total{font-size:18px;font-weight:bold}</style></head><body>
                        <h1>Invoice ${inv.invoiceNo}</h1>
                        <p><strong>Patient:</strong> ${inv.patientName}</p>
                        <p><strong>Date:</strong> ${fmt(inv.date)} | <strong>Due:</strong> ${inv.dueDate ? fmt(inv.dueDate) : 'N/A'}</p>
                        <table><tr><th>Service</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                          ${inv.services.map(s => `<tr><td>${s.desc}</td><td>${s.qty}</td><td>$${parseFloat(s.rate).toFixed(2)}</td><td>$${((parseFloat(s.rate) || 0) * (parseInt(s.qty) || 1)).toFixed(2)}</td></tr>`).join('')}
                        </table>
                        <p>Subtotal: $${inv.subtotal} | Discount: −$${inv.discountAmt} | Tax: +$${inv.taxAmt}</p>
                        <p class="total">Total: $${inv.total}</p>
                        <p style="color:green;font-weight:bold">✓ PAID</p>
                      </body></html>`);
                      w.document.close(); w.print();
                    }} style={{ padding: '5px 12px', borderRadius: 8, background: T.accentSoft, border: `1px solid ${T.accentGlow}`, cursor: 'pointer', color: T.accent, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                      🖨 Print
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Reminders Page ──────────────────────────────────────────────────────────
  const renderReminders = () => {
    const reminders = db.reminders || [];
    const filtered = reminders.filter(r => {
      if (reminderFilter === 'all') return true;
      if (reminderFilter === 'overdue') return r.status === 'active' && r.dueDate < today;
      return r.status === reminderFilter;
    });

    const PRIORITY_COLORS = { High: T.red, Medium: T.yellow, Low: T.green };
    const TYPE_ICONS = { 'Follow-up': '🔁', 'Medication': '💊', 'Lab Result': '🔬', 'Appointment': '📅', 'General': '📌', 'Urgent': '🚨' };

    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Reminders & Alerts</div>
            <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{activeReminders} active · {overdueReminders > 0 ? <span style={{ color: T.red }}>{overdueReminders} overdue</span> : '0 overdue'}</div>
          </div>
          <button onClick={() => db.patients.length > 0 ? setModal({ type: 'reminder' }) : showToast('Add a patient first!', 'warn')}
            className="btn-primary" style={{ ...inputBtnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic d={ic.plus} size={14} color={T.bg} /> New Reminder
          </button>
        </div>

        {/* Overdue banner */}
        {overdueReminders > 0 && (
          <div className="slide-down" style={{ padding: '12px 16px', background: T.redBg, borderRadius: 12, border: `1px solid ${T.red}40`, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18 }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.red }}>{overdueReminders} overdue reminder{overdueReminders > 1 ? 's' : ''}</div>
              <div style={{ fontSize: 11.5, color: T.textSub }}>These reminders have passed their due date and need your attention</div>
            </div>
            <button onClick={() => setReminderFilter('overdue')} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, background: T.redBg, border: `1px solid ${T.red}40`, cursor: 'pointer', color: T.red, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
              View All →
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: T.bgCard, padding: '4px', borderRadius: 12, border: `1px solid ${T.border}`, width: 'fit-content' }}>
          {['all', 'active', 'overdue', 'snoozed', 'dismissed'].map(f => (
            <button key={f} onClick={() => setReminderFilter(f)} style={{
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: reminderFilter === f ? T.bgElevated : 'transparent',
              color: reminderFilter === f ? T.text : T.textDim,
              fontSize: 12, fontWeight: reminderFilter === f ? 700 : 500,
              fontFamily: "'Space Grotesk',sans-serif", transition: 'all 0.15s', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>

        <div style={card}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>
              {reminders.length === 0 ? 'No reminders yet — create your first reminder!' : 'Nothing here for this filter'}
            </div>
          ) : filtered.map(rem => {
            const isOverdue = rem.status === 'active' && rem.dueDate && rem.dueDate < today;
            const priColor = PRIORITY_COLORS[rem.priority] || T.textSub;
            const daysUntil = rem.dueDate ? Math.ceil((new Date(rem.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <div key={rem.id} style={{ padding: '14px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${isOverdue ? T.red + '50' : rem.status === 'dismissed' ? T.border : `${priColor}30`}`, marginBottom: 8, opacity: rem.status === 'dismissed' ? 0.5 : 1, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `${priColor}15`, border: `1px solid ${priColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {TYPE_ICONS[rem.type] || '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>{rem.title}</div>
                        <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 1 }}>{rem.patientName}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <Badge color={priColor}>{rem.priority}</Badge>
                        <Badge color={rem.status === 'dismissed' ? T.textDim : isOverdue ? T.red : rem.status === 'snoozed' ? T.yellow : T.green}>
                          {isOverdue ? 'Overdue' : rem.status}
                        </Badge>
                      </div>
                    </div>
                    {rem.message && <div style={{ fontSize: 12, color: T.textSub, marginTop: 6, lineHeight: 1.5 }}>{rem.message}</div>}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: T.textDim }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>📅 {rem.dueDate ? fmt(rem.dueDate) : 'No date'}{rem.dueTime ? ` · ${rem.dueTime}` : ''}</span>
                      {daysUntil !== null && rem.status === 'active' && !isOverdue && (
                        <span style={{ color: daysUntil <= 1 ? T.yellow : T.textDim }}>
                          {daysUntil === 0 ? '⚡ Today' : daysUntil === 1 ? '⚡ Tomorrow' : `in ${daysUntil}d`}
                        </span>
                      )}
                      {isOverdue && <span style={{ color: T.red, fontWeight: 700 }}>⚠ {Math.abs(daysUntil)}d overdue</span>}
                      <span>🔔 Notify {rem.notifyBefore}min before</span>
                      <Badge color={T.purple}>{rem.type}</Badge>
                    </div>
                  </div>
                </div>
                {rem.status !== 'dismissed' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => dismissReminder(rem.id)} style={{ padding: '5px 12px', borderRadius: 8, background: T.bgHover, border: `1px solid ${T.border}`, cursor: 'pointer', color: T.textSub, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                      ✓ Dismiss
                    </button>
                    {rem.status === 'active' && (
                      <button onClick={() => snoozeReminder(rem.id)} style={{ padding: '5px 12px', borderRadius: 8, background: T.yellowBg, border: `1px solid ${T.yellow}30`, cursor: 'pointer', color: T.yellow, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                        💤 Snooze 1d
                      </button>
                    )}
                    <button onClick={() => { setRemForm({ ...blankReminder, ...rem }); setModal({ type: 'reminder' }); }} style={{ padding: '5px 12px', borderRadius: 8, background: T.accentSoft, border: `1px solid ${T.accentGlow}`, cursor: 'pointer', color: T.accent, fontSize: 11.5, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>
                      ✏ Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const pageMap = {
    dashboard: renderDashboard,
    appointments: renderAppointments,
    patients: renderPatients,
    prescriptions: renderPrescriptions,
    diagnoses: renderDiagnoses,
    vitals: renderVitals,
    notes: renderNotes,
    billing: renderBilling,
    reminders: renderReminders,
    tasks: renderTasks,
    analytics: renderAnalytics,
    records: renderRecords,
    settings: renderSettings,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{makeGlobalCSS(activeTheme)}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'Space Grotesk', sans-serif", color: T.text }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside style={{
          width: sidebarCollapsed ? 64 : 240,
          minWidth: sidebarCollapsed ? 64 : 240,
          background: T.bgCard,
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          padding: sidebarCollapsed ? '16px 10px' : '16px 12px',
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
          transition: 'all 0.25s ease',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingLeft: sidebarCollapsed ? 2 : 5 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${T.accent}30` }}>
              <span style={{ fontSize: 16, color: T.bg }}>⚕</span>
            </div>
            {!sidebarCollapsed && <span style={{ fontWeight: 800, fontSize: 16, color: T.text, letterSpacing: '-0.3px' }}>MediPredict</span>}
          </div>

          {/* Doctor card */}
          {!sidebarCollapsed && (
            <div style={{ padding: '11px', background: T.bgElevated, borderRadius: 11, border: `1px solid ${T.border}`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Avatar name={doctor.name} size={34} radius={9} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.name}</div>
                <div style={{ fontSize: 10, color: T.textDim }}>{doctor.specialty}</div>
              </div>
            </div>
          )}

          {/* Nav */}
          {!sidebarCollapsed && <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 7px 7px' }}>Navigation</div>}
          {navItems.map(item => (
            <button key={item.id} className="nav-btn" onClick={() => setActiveTab(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: sidebarCollapsed ? '10px' : '9px 11px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === item.id ? T.accentSoft : 'transparent',
              color: activeTab === item.id ? T.accent : T.textSub,
              fontWeight: activeTab === item.id ? 700 : 500, fontSize: 12.5,
              transition: 'all .15s', textAlign: 'left',
              fontFamily: "'Space Grotesk', sans-serif",
              borderLeft: activeTab === item.id ? `2px solid ${T.accent}` : '2px solid transparent',
              marginBottom: 2, justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              position: 'relative',
            }}>
              <Ic d={item.icon} size={15} color={activeTab === item.id ? T.accent : T.textDim} />
              {!sidebarCollapsed && item.label}
              {!sidebarCollapsed && item.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: T.accent, color: T.bg, fontSize: 9.5, fontWeight: 800, borderRadius: 20, padding: '1px 6px', fontFamily: "'JetBrains Mono', monospace" }}>{item.badge}</span>
              )}
              {sidebarCollapsed && item.badge > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: T.red }} />
              )}
            </button>
          ))}

          {!sidebarCollapsed && <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 7px 7px' }}>Account</div>}
          {[{ id: 'settings', label: 'Settings', icon: ic.set }].map(item => (
            <button key={item.id} className="nav-btn" onClick={() => setActiveTab(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: sidebarCollapsed ? '10px' : '9px 11px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === item.id ? T.accentSoft : 'transparent',
              color: activeTab === item.id ? T.accent : T.textSub,
              fontWeight: activeTab === item.id ? 700 : 500, fontSize: 12.5,
              transition: 'all .15s', fontFamily: "'Space Grotesk', sans-serif",
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start', marginBottom: 2,
            }}>
              <Ic d={item.icon} size={15} color={activeTab === item.id ? T.accent : T.textDim} />
              {!sidebarCollapsed && item.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto' }}>
            {!sidebarCollapsed && (
              <div style={{ padding: '12px', background: T.bgElevated, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 3 }}>Quick Add</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {[['Patient', ic.usr, 'patient'], ['Appointment', ic.cal, 'apt'], ['Rx', ic.pill, 'rx'], ['Diagnosis', ic.flask, 'diag']].map(([l, ico, t]) => (
                    <button key={t} onClick={() => db.patients.length > 0 || t === 'patient' ? setModal({ type: t }) : showToast('Add a patient first!', 'warn')}
                      style={{ padding: '7px 4px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: T.textDim, fontSize: 9.5, fontWeight: 600, transition: 'all .15s', fontFamily: "'Space Grotesk', sans-serif" }}>
                      <Ic d={ico} size={13} color={T.accent} />{l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleLogout} style={{
              width: '100%', padding: sidebarCollapsed ? '10px' : '9px', borderRadius: 10,
              border: `1px solid ${T.border}`, background: 'transparent', color: T.textSub,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 7,
            }}>
              <Ic d={ic.out} size={14} color={T.textDim} />
              {!sidebarCollapsed && 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: T.bgCard, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 20 }}>

            {/* Sidebar toggle */}
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgElevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSub, flexShrink: 0 }}>
              <Ic d={sidebarCollapsed ? ic.chR : ic.chL} size={14} />
            </button>

            {/* Search */}
            <div style={{ flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, background: T.bgElevated, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '8px 13px' }}>
              <Ic d={ic.search} size={14} color={T.textDim} />
              <input value={searchQ} onChange={e => { setSearchQ(e.target.value); if (e.target.value) setActiveTab('patients'); }}
                placeholder="Search patients…"
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.text, width: '100%', fontFamily: "'Space Grotesk', sans-serif" }} />
            </div>

            {/* Tab breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSub, marginLeft: 4 }}>
              <span>Dashboard</span>
              {activeTab !== 'dashboard' && (
                <>
                  <Ic d={ic.chR} size={10} color={T.textDim} />
                  <span style={{ color: T.text, fontWeight: 700, textTransform: 'capitalize' }}>{activeTab}</span>
                </>
              )}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <LiveClock />

              {/* Theme Picker */}
              <div style={{ position: 'relative' }}>
                <button
                  className="tooltip-wrap"
                  onClick={() => setShowThemePicker(v => !v)}
                  style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgElevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 15 }}>🎨</span>
                  <span className="tooltip">Change Theme</span>
                </button>
                {showThemePicker && (
                  <div className="slide-down" style={{ position: 'absolute', right: 0, top: 44, width: 260, background: T.bgCard, borderRadius: 14, boxShadow: `0 16px 48px rgba(0,0,0,0.5)`, border: `1px solid ${T.border}`, zIndex: 100, padding: '12px', overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Choose Theme</div>
                    {Object.entries(THEMES).map(([name, theme]) => (
                      <button key={name} onClick={() => changeTheme(name)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                        borderRadius: 10, border: `1px solid ${activeThemeName === name ? theme.accent : 'transparent'}`,
                        background: activeThemeName === name ? `${theme.accent}12` : 'transparent',
                        cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s',
                      }}>
                        {/* Color swatches */}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          {[theme.bg, theme.accent, theme.green, theme.red].map((c, ci) => (
                            <div key={ci} style={{ width: 11, height: 11, borderRadius: 3, background: c, border: `1px solid rgba(255,255,255,0.15)` }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: activeThemeName === name ? 700 : 500, color: activeThemeName === name ? theme.accent : T.textSub, fontFamily: "'Space Grotesk', sans-serif", flex: 1, textAlign: 'left' }}>{name}</span>
                        {activeThemeName === name && <Ic d={ic.check} size={13} color={theme.accent} sw={2.5} />}
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: `${theme.mode === 'dark' ? '#fff1' : '#0001'}`, color: theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{theme.mode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgElevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                  onClick={() => setShowNotifs(!showNotifs)}>
                  <Ic d={ic.bell} size={15} color={T.textSub} />
                  {unread > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, borderRadius: '50%', background: T.red, color: 'white', fontSize: 9, fontWeight: 800, border: `2px solid ${T.bgCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace" }}>{unread}</span>
                  )}
                </button>
                {showNotifs && (
                  <div style={{ position: 'absolute', right: 0, top: 44, width: 310, background: T.bgCard, borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', border: `1px solid ${T.border}`, zIndex: 50, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Notifications</div>
                      <button onClick={() => updateDB(d => ({ ...d, notifications: d.notifications.map(n => ({ ...n, read: true })) }))}
                        style={{ fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Mark all read</button>
                    </div>
                    {db.notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: T.textDim }}>No notifications</div>
                    ) : db.notifications.slice(0, 20).map(n => (
                      <div key={n.id} onClick={() => updateDB(d => ({ ...d, notifications: d.notifications.map(x => x.id === n.id ? { ...x, read: true } : x) }))}
                        style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: !n.read ? T.accentSoft : 'transparent', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'background 0.15s' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {n.type === 'appointment' ? '📅' : n.type === 'lab' ? '🔬' : n.type === 'patient' ? '👤' : '💊'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: T.textSub, marginTop: 1 }}>{n.message}</div>
                        </div>
                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: 5 }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
                <Avatar name={doctor.name} size={34} radius={9} />
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div style={{ flex: 1, display: 'flex', overflowY: 'auto' }}>
            <div style={{ flex: 1, padding: '20px', minWidth: 0 }}>
              {(pageMap[activeTab] || renderDashboard)()}
            </div>

            {/* Right Panel — dashboard + appointments only */}
            {(activeTab === 'dashboard' || activeTab === 'appointments') && (
              <div style={{ width: 276, minWidth: 276, background: T.bgCard, borderLeft: `1px solid ${T.border}`, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

                {/* Doctor info */}
                <div style={{ background: T.bgElevated, borderRadius: 13, padding: '13px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar name={doctor.name} size={46} radius={12} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{doctor.name}</div>
                      <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 1 }}>{doctor.specialty}</div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                        <Badge color={T.green}>● Active</Badge>
                        {doctor.license && <Badge color={T.yellow}>{doctor.license}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar */}
                <div style={{ background: T.bgElevated, borderRadius: 13, padding: '13px', border: `1px solid ${T.border}` }}>
                  <CalendarStrip appointments={db.appointments} />
                </div>

                {/* Upcoming appointments */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Upcoming</div>
                    <button onClick={() => setActiveTab('appointments')} style={{ fontSize: 10, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>See All</button>
                  </div>
                  {upcoming.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 11, color: T.textDim }}>No upcoming appointments</div>
                  ) : upcoming.slice(0, 5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', background: T.bgElevated, borderRadius: 10, marginBottom: 5, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <Avatar name={a.patientName} size={30} radius={8} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patientName}</div>
                        <div style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{fmtShort(a.date)} {a.time && `· ${a.time}`}</div>
                      </div>
                      <Ic d={ic.chR} size={12} color={T.textDim} />
                    </div>
                  ))}
                </div>

                {/* Tasks preview */}
                {openTasks > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>Tasks</div>
                      <Badge color={T.purple}>{openTasks} open</Badge>
                    </div>
                    {db.tasks.filter(t => !t.done).slice(0, 3).map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: T.bgElevated, borderRadius: 9, marginBottom: 4, border: `1px solid ${T.border}` }}>
                        <button onClick={() => updateDB(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, done: true } : t) }))}
                          style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                        <Badge color={task.priority === 'High' ? T.red : task.priority === 'Medium' ? T.yellow : T.textDim}>{task.priority}</Badge>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('tasks')} style={{ width: '100%', padding: '7px', borderRadius: 9, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSub, fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                      View all tasks →
                    </button>
                  </div>
                )}

                {/* Billing & Reminders mini-panel */}
                <div style={{ background: T.bgElevated, borderRadius: 13, padding: '13px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>Finance & Alerts</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div onClick={() => setActiveTab('billing')} style={{ padding: '10px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: T.green, fontFamily: "'JetBrains Mono',monospace" }}>${totalRevenue.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>Collected</div>
                    </div>
                    <div onClick={() => setActiveTab('billing')} style={{ padding: '10px', background: T.bg, borderRadius: 10, border: `1px solid ${unpaidInvoices > 0 ? T.yellow + '40' : T.border}`, cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: unpaidInvoices > 0 ? T.yellow : T.textSub, fontFamily: "'JetBrains Mono',monospace" }}>{unpaidInvoices}</div>
                      <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>Unpaid</div>
                    </div>
                  </div>
                  {overdueReminders > 0 && (
                    <div onClick={() => setActiveTab('reminders')} style={{ padding: '9px 12px', background: T.redBg, borderRadius: 9, border: `1px solid ${T.red}30`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.red }}>{overdueReminders} Overdue Reminder{overdueReminders > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 10, color: T.textSub }}>Tap to review</div>
                      </div>
                    </div>
                  )}
                  {overdueReminders === 0 && activeReminders > 0 && (
                    <div onClick={() => setActiveTab('reminders')} style={{ padding: '9px 12px', background: T.purpleBg, borderRadius: 9, border: `1px solid ${T.purple}30`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>🔔</span>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.purple }}>{activeReminders} active reminder{activeReminders > 1 ? 's' : ''}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {modal?.type === 'patient' && (
        <Modal title="Register New Patient" onClose={() => setModal(null)} icon={ic.usr}>
          <form onSubmit={addPatient}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full Name *" span={2}><input value={patForm.name} onChange={e => setPatForm({ ...patForm, name: e.target.value })} placeholder="Jane Doe" style={inputStyle} required /></Field>
              <Field label="Age"><input value={patForm.age} onChange={e => setPatForm({ ...patForm, age: e.target.value })} placeholder="35" style={inputStyle} type="number" /></Field>
              <Field label="Gender"><select value={patForm.gender} onChange={e => setPatForm({ ...patForm, gender: e.target.value })} style={inputStyle}><option>Male</option><option>Female</option><option>Other</option></select></Field>
              <Field label="Email"><input value={patForm.contact} onChange={e => setPatForm({ ...patForm, contact: e.target.value })} placeholder="patient@email.com" style={inputStyle} /></Field>
              <Field label="Phone"><input value={patForm.phone} onChange={e => setPatForm({ ...patForm, phone: e.target.value })} placeholder="+1 555-000-0000" style={inputStyle} /></Field>
              <Field label="Blood Group"><select value={patForm.bloodGroup} onChange={e => setPatForm({ ...patForm, bloodGroup: e.target.value })} style={inputStyle}><option value="">Unknown</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}</select></Field>
              <Field label="Status"><select value={patForm.status} onChange={e => setPatForm({ ...patForm, status: e.target.value })} style={inputStyle}><option>Stable</option><option>Under Treatment</option><option>Improving</option><option>Critical</option></select></Field>
              <Field label="Primary Condition" span={2}><input value={patForm.condition} onChange={e => setPatForm({ ...patForm, condition: e.target.value })} placeholder="e.g., Hypertension, Diabetes" style={inputStyle} /></Field>
              <Field label="Known Allergies" span={2}><input value={patForm.allergies} onChange={e => setPatForm({ ...patForm, allergies: e.target.value })} placeholder="e.g., Penicillin, Sulfa drugs" style={inputStyle} /></Field>
              <Field label="Notes" span={2}><textarea value={patForm.notes} onChange={e => setPatForm({ ...patForm, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="Additional notes…" /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Register Patient</button></div>
          </form>
        </Modal>
      )}

      {modal?.type === 'apt' && (
        <Modal title="Schedule Appointment" onClose={() => setModal(null)} icon={ic.cal}>
          <form onSubmit={addAppointment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={aptForm.patientId} onChange={e => setAptForm({ ...aptForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Date *"><input type="date" value={aptForm.date} onChange={e => setAptForm({ ...aptForm, date: e.target.value })} style={inputStyle} required min={today} /></Field>
              <Field label="Time *"><input type="time" value={aptForm.time} onChange={e => setAptForm({ ...aptForm, time: e.target.value })} style={inputStyle} required /></Field>
              <Field label="Type">
                <select value={aptForm.type} onChange={e => setAptForm({ ...aptForm, type: e.target.value })} style={inputStyle}>
                  {['Consultation', 'Follow-up', 'New Patient', 'Emergency', 'Check-up', 'Procedure', 'Telehealth'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Duration">
                <select value={aptForm.duration} onChange={e => setAptForm({ ...aptForm, duration: e.target.value })} style={inputStyle}>
                  {['15', '30', '45', '60', '90', '120'].map(d => <option key={d}>{d} min</option>)}
                </select>
              </Field>
              <Field label="Reason" span={2}><input value={aptForm.reason} onChange={e => setAptForm({ ...aptForm, reason: e.target.value })} placeholder="e.g., Annual checkup, follow-up" style={inputStyle} /></Field>
              <Field label="Notes" span={2}><textarea value={aptForm.notes} onChange={e => setAptForm({ ...aptForm, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 55 }} placeholder="Pre-appointment notes…" /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Schedule Appointment</button></div>
          </form>
        </Modal>
      )}

      {modal?.type === 'rx' && (
        <Modal title="Issue Prescription" onClose={() => setModal(null)} icon={ic.pill}>
          <form onSubmit={addPrescription}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={rxForm.patientId} onChange={e => setRxForm({ ...rxForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Medication *" span={2}><input value={rxForm.medication} onChange={e => setRxForm({ ...rxForm, medication: e.target.value })} placeholder="e.g., Amoxicillin" style={inputStyle} required /></Field>
              <Field label="Dosage *"><input value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} placeholder="500mg" style={inputStyle} required /></Field>
              <Field label="Frequency *"><input value={rxForm.frequency} onChange={e => setRxForm({ ...rxForm, frequency: e.target.value })} placeholder="Twice daily" style={inputStyle} required /></Field>
              <Field label="Duration *"><input value={rxForm.duration} onChange={e => setRxForm({ ...rxForm, duration: e.target.value })} placeholder="7 days" style={inputStyle} required /></Field>
              <Field label="Refills"><input value={rxForm.refills} onChange={e => setRxForm({ ...rxForm, refills: e.target.value })} placeholder="0" type="number" style={inputStyle} /></Field>
              <Field label="Special Instructions" span={2}><textarea value={rxForm.instructions} onChange={e => setRxForm({ ...rxForm, instructions: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="e.g., Take with food, avoid direct sunlight" /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Issue Prescription</button></div>
          </form>
        </Modal>
      )}

      {modal?.type === 'diag' && (
        <Modal title="Record Diagnosis" onClose={() => setModal(null)} icon={ic.flask}>
          <form onSubmit={addDiagnosis}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={diagForm.patientId} onChange={e => setDiagForm({ ...diagForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Diagnosis *"><input value={diagForm.diagnosis} onChange={e => setDiagForm({ ...diagForm, diagnosis: e.target.value })} placeholder="e.g., Type 2 Diabetes" style={inputStyle} required /></Field>
              <Field label="Severity"><select value={diagForm.severity} onChange={e => setDiagForm({ ...diagForm, severity: e.target.value })} style={inputStyle}><option>Mild</option><option>Moderate</option><option>Severe</option><option>Critical</option></select></Field>
              <Field label="Symptoms *" span={2}><textarea value={diagForm.symptoms} onChange={e => setDiagForm({ ...diagForm, symptoms: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="Observed symptoms…" required /></Field>
              <Field label="Tests Ordered" span={2}><input value={diagForm.tests} onChange={e => setDiagForm({ ...diagForm, tests: e.target.value })} placeholder="e.g., CBC, HbA1c, ECG" style={inputStyle} /></Field>
              <Field label="Follow-up Date"><input type="date" value={diagForm.followUp} onChange={e => setDiagForm({ ...diagForm, followUp: e.target.value })} style={inputStyle} /></Field>
              <Field label="Notes"><input value={diagForm.notes} onChange={e => setDiagForm({ ...diagForm, notes: e.target.value })} placeholder="Additional observations…" style={inputStyle} /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Record Diagnosis</button></div>
          </form>
        </Modal>
      )}

      {modal?.type === 'vitals' && (
        <Modal title="Record Vitals" onClose={() => setModal(null)} icon={ic.activity}>
          <form onSubmit={addVitals}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={vitForm.patientId} onChange={e => setVitForm({ ...vitForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Systolic BP (mmHg)"><input type="number" value={vitForm.bp_sys} onChange={e => setVitForm({ ...vitForm, bp_sys: e.target.value })} placeholder="120" style={inputStyle} /></Field>
              <Field label="Diastolic BP (mmHg)"><input type="number" value={vitForm.bp_dia} onChange={e => setVitForm({ ...vitForm, bp_dia: e.target.value })} placeholder="80" style={inputStyle} /></Field>
              <Field label="Heart Rate (bpm)"><input type="number" value={vitForm.heartRate} onChange={e => setVitForm({ ...vitForm, heartRate: e.target.value })} placeholder="72" style={inputStyle} /></Field>
              <Field label="Temperature (°F)"><input type="number" step="0.1" value={vitForm.temp} onChange={e => setVitForm({ ...vitForm, temp: e.target.value })} placeholder="98.6" style={inputStyle} /></Field>
              <Field label="Oxygen Saturation (%)"><input type="number" value={vitForm.oxygen} onChange={e => setVitForm({ ...vitForm, oxygen: e.target.value })} placeholder="98" style={inputStyle} /></Field>
              <Field label="Weight (kg)"><input type="number" value={vitForm.weight} onChange={e => setVitForm({ ...vitForm, weight: e.target.value })} placeholder="70" style={inputStyle} /></Field>
              <Field label="Height (cm)"><input type="number" value={vitForm.height} onChange={e => setVitForm({ ...vitForm, height: e.target.value })} placeholder="170" style={inputStyle} /></Field>
              <Field label="Notes" span={2}><textarea value={vitForm.notes} onChange={e => setVitForm({ ...vitForm, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} placeholder="Observations…" /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Save Vitals</button></div>
          </form>
        </Modal>
      )}

      {modal?.type === 'note' && (
        <Modal title="New Clinical Note" onClose={() => setModal(null)} icon={ic.notes}>
          <form onSubmit={addNote}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={noteForm.patientId} onChange={e => setNoteForm({ ...noteForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title *"><input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Note title" style={inputStyle} required /></Field>
              <Field label="Category"><select value={noteForm.category} onChange={e => setNoteForm({ ...noteForm, category: e.target.value })} style={inputStyle}>{['General', 'SOAP', 'Progress', 'Discharge', 'Referral', 'Procedure'].map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Note Content *" span={2}>
                <textarea value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} placeholder="Clinical notes, observations, plan…" required />
              </Field>
              <Field label="" span={2}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={noteForm.private} onChange={e => setNoteForm({ ...noteForm, private: e.target.checked })} />
                  <span style={{ fontSize: 12, color: T.textSub }}>Mark as private (not visible to patient)</span>
                </label>
              </Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Save Note</button></div>
          </form>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── INVOICE MODAL ─────────────────────────────────────────────── */}
      {modal?.type === 'invoice' && (
        <Modal title="Create Invoice" onClose={() => setModal(null)} icon={ic.invoice} width={580}>
          <form onSubmit={addInvoice}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={invForm.patientId} onChange={e => setInvForm({ ...invForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>

            {/* Service Lines */}
            <div style={{ marginTop: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={labelStyle}>Services / Line Items *</label>
                <button type="button" onClick={() => setInvForm(f => ({ ...f, services: [...f.services, { desc: '', qty: 1, rate: '' }] }))}
                  style={{ fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>+ Add Line</button>
              </div>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 30px', gap: 6, marginBottom: 4 }}>
                {['Description', 'Qty', 'Rate ($)', ''].map(h => <div key={h} style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>)}
              </div>
              {invForm.services.map((svc, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 30px', gap: 6, marginBottom: 6 }}>
                  <input value={svc.desc} onChange={e => setInvForm(f => ({ ...f, services: f.services.map((s, j) => j === i ? { ...s, desc: e.target.value } : s) }))} placeholder="e.g., Consultation" style={inputStyle} required={i === 0} />
                  <input value={svc.qty} type="number" min="1" onChange={e => setInvForm(f => ({ ...f, services: f.services.map((s, j) => j === i ? { ...s, qty: e.target.value } : s) }))} style={inputStyle} />
                  <input value={svc.rate} type="number" step="0.01" onChange={e => setInvForm(f => ({ ...f, services: f.services.map((s, j) => j === i ? { ...s, rate: e.target.value } : s) }))} placeholder="0.00" style={inputStyle} />
                  <button type="button" onClick={() => setInvForm(f => ({ ...f, services: f.services.filter((_, j) => j !== i) }))} disabled={invForm.services.length === 1}
                    style={{ width: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', color: T.red, fontSize: 14, opacity: invForm.services.length === 1 ? 0.3 : 1 }}>×</button>
                </div>
              ))}
              {/* Totals preview */}
              {(() => {
                const sub = invForm.services.reduce((s, sv) => s + (parseFloat(sv.rate) || 0) * (parseInt(sv.qty) || 1), 0);
                const disc = sub * ((parseFloat(invForm.discount) || 0) / 100);
                const tax = (sub - disc) * ((parseFloat(invForm.tax) || 0) / 100);
                const total = sub - disc + tax;
                return (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: T.bgElevated, borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSub, marginBottom: 3 }}><span>Subtotal</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>${sub.toFixed(2)}</span></div>
                    {disc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.green, marginBottom: 3 }}><span>Discount ({invForm.discount}%)</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>−${disc.toFixed(2)}</span></div>}
                    {tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSub, marginBottom: 3 }}><span>Tax ({invForm.tax}%)</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>+${tax.toFixed(2)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: T.text, marginTop: 5, borderTop: `1px solid ${T.border}`, paddingTop: 7 }}><span>Total</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: T.accent }}>${total.toFixed(2)}</span></div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
              <Field label="Discount (%)"><input type="number" value={invForm.discount} onChange={e => setInvForm({ ...invForm, discount: e.target.value })} placeholder="0" style={inputStyle} min="0" max="100" /></Field>
              <Field label="Tax (%)"><input type="number" value={invForm.tax} onChange={e => setInvForm({ ...invForm, tax: e.target.value })} placeholder="0" style={inputStyle} min="0" /></Field>
              <Field label="Due Date"><input type="date" value={invForm.dueDate} onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })} style={inputStyle} /></Field>
              <Field label="Notes" span={3}><input value={invForm.notes} onChange={e => setInvForm({ ...invForm, notes: e.target.value })} placeholder="Payment terms, additional notes…" style={inputStyle} /></Field>
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Create Invoice</button></div>
          </form>
        </Modal>
      )}

      {/* ── REMINDER MODAL ────────────────────────────────────────────── */}
      {modal?.type === 'reminder' && (
        <Modal title="Set Reminder" onClose={() => { setModal(null); setRemForm(blankReminder); }} icon={ic.reminder} width={520}>
          <form onSubmit={addReminder}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Patient *" span={2}>
                <select value={remForm.patientId} onChange={e => setRemForm({ ...remForm, patientId: e.target.value })} style={inputStyle} required>
                  <option value="">Select Patient</option>
                  {db.patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Reminder Title *" span={2}>
                <input value={remForm.title} onChange={e => setRemForm({ ...remForm, title: e.target.value })} placeholder="e.g., Follow-up check, Lab results review" style={inputStyle} required />
              </Field>
              <Field label="Type">
                <select value={remForm.type} onChange={e => setRemForm({ ...remForm, type: e.target.value })} style={inputStyle}>
                  {['Follow-up', 'Medication', 'Lab Result', 'Appointment', 'General', 'Urgent'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={remForm.priority} onChange={e => setRemForm({ ...remForm, priority: e.target.value })} style={inputStyle}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </Field>
              <Field label="Due Date *">
                <input type="date" value={remForm.dueDate} onChange={e => setRemForm({ ...remForm, dueDate: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Due Time">
                <input type="time" value={remForm.dueTime} onChange={e => setRemForm({ ...remForm, dueTime: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Notify Before (min)" span={2}>
                <select value={remForm.notifyBefore} onChange={e => setRemForm({ ...remForm, notifyBefore: e.target.value })} style={inputStyle}>
                  {['15', '30', '60', '120', '1440'].map(v => <option key={v} value={v}>{v === '1440' ? '1 day' : `${v} min`}</option>)}
                </select>
              </Field>
              <Field label="Message" span={2}>
                <textarea value={remForm.message} onChange={e => setRemForm({ ...remForm, message: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 65 }} placeholder="Details about what needs attention…" />
              </Field>
            </div>
            {/* Priority preview */}
            <div style={{ marginTop: 10, padding: '10px 12px', background: T.bgElevated, borderRadius: 10, border: `1px solid ${remForm.priority === 'High' ? T.red + '40' : remForm.priority === 'Medium' ? T.yellow + '40' : T.green + '40'}` }}>
              <div style={{ fontSize: 11, color: T.textDim }}>Preview</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 3 }}>{remForm.title || 'Untitled Reminder'}</div>
              {remForm.dueDate && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>📅 {fmt(remForm.dueDate)}{remForm.dueTime ? ` at ${remForm.dueTime}` : ''} · notify {remForm.notifyBefore}min before</div>}
            </div>
            <div style={{ marginTop: 14 }}><button type="submit" className="btn-primary" style={btnPrimary}>Set Reminder</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}