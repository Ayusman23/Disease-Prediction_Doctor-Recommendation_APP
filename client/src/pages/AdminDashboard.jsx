import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db as firestoreDB } from "../firebase/config";
import {
    collection, getDocs, doc, deleteDoc, setDoc, getDoc, serverTimestamp, query, where
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { fetchSqlUsers } from "../services/patientApi";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
    bg: '#07090F', bgCard: '#0D1117', bgElevated: '#111827', bgHover: '#1a2235',
    border: '#1f2d45', borderLight: '#253550',
    accent: '#6366f1', accentDim: '#4f46e5', accentGlow: 'rgba(99,102,241,0.18)', accentSoft: 'rgba(99,102,241,0.09)',
    green: '#22d3a5', greenBg: 'rgba(34,211,165,0.1)',
    yellow: '#fbbf24', yellowBg: 'rgba(251,191,36,0.1)',
    red: '#f43f5e', redBg: 'rgba(244,63,94,0.1)',
    purple: '#a78bfa', purpleBg: 'rgba(167,139,250,0.1)',
    blue: '#38bdf8', blueBg: 'rgba(56,189,248,0.1)',
    text: '#e2e8f0', textSub: '#7c8db5', textDim: '#3d5070', white: '#fff',
};

const ADMIN_EMAIL = 'ayusmansamantaray08@gmail.com';
const GUEST_TOKEN_KEY = 'admin_guest_tokens';

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; font-family: 'Space Grotesk', sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
  .fade-in { animation: fadeIn .35s ease forwards; }
  .slide-in { animation: slideIn .25s ease forwards; }
  .nav-btn:hover { background: ${T.accentSoft} !important; color: ${T.accent} !important; }
  .card-hover { transition: all .2s ease; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.35), 0 0 0 1px ${T.accentGlow}; }
  .row-hover:hover { background: ${T.accentSoft} !important; }
  input:focus, select:focus, textarea:focus { outline:none; border-color:${T.accent} !important; box-shadow: 0 0 0 3px ${T.accentGlow}; }
  .pulsing { animation: pulse 2s infinite; }
  .btn-primary:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .btn-primary:active { transform:translateY(0); }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = 'currentColor', sw = 1.7 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);

const ic = {
    dash: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    doctor: "M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5z M4 20v-1a7 7 0 0114 0v1",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    copy: "M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2 M16 4h2a2 2 0 012 2v2 M8 4h8 M8 4v8h8V4",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10 M23 14l-4.64 4.36A9 9 0 013.51 15",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8 M12 9a3 3 0 100 6 3 3 0 000-6",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    stats: "M18 20V10M12 20V4M6 20v-6",
    warn: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01",
    key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zM11 6l7 7",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 11);
const fmt = d => { try { return new Date(d?.seconds ? d.seconds * 1000 : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } };
const initials = n => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const COLORS = ['#6366f1', '#22d3a5', '#fbbf24', '#f43f5e', '#38bdf8', '#a78bfa'];
const getColor = name => COLORS[(name || '').charCodeAt(0) % COLORS.length];

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const Avatar = ({ name, size = 38 }) => (
    <div style={{
        width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
        background: `linear-gradient(135deg,${getColor(name)}25,${getColor(name)}50)`,
        border: `1.5px solid ${getColor(name)}45`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, color: getColor(name), fontSize: size * 0.33,
        fontFamily: "'JetBrains Mono',monospace",
    }}>{initials(name)}</div>
);

const Badge = ({ children, color = T.accent }) => (
    <span style={{
        padding: '2px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
        background: `${color}15`, color, border: `1px solid ${color}25`,
        fontFamily: "'JetBrains Mono',monospace",
    }}>{children}</span>
);

const Toast = ({ msg, type = 'success', onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); });
    const color = type === 'error' ? T.red : type === 'warn' ? T.yellow : T.green;
    return (
        <div className="fade-in" style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
            background: T.bgElevated, color: T.text, padding: '12px 18px',
            borderRadius: 14, fontSize: 13, fontWeight: 600,
            boxShadow: `0 12px 40px rgba(0,0,0,.5), 0 0 0 1px ${color}30`,
            display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${color}30`,
            fontFamily: "'Space Grotesk',sans-serif", backdropFilter: 'blur(12px)', maxWidth: 340,
        }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={type === 'error' ? ic.x : ic.check} size={13} color={color} />
            </div>
            <span style={{ flex: 1 }}>{msg}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, padding: 2 }}>
                <Ic d={ic.x} size={12} color={T.textDim} />
            </button>
        </div>
    );
};

const Modal = ({ title, onClose, children, width = 520, icon }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }} onClick={onClose}>
        <div className="fade-in" style={{
            background: T.bgCard, borderRadius: 20, padding: '26px 28px',
            width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
            border: `1px solid ${T.border}`, boxShadow: `0 32px 80px rgba(0,0,0,.6), 0 0 0 1px ${T.accentGlow}`,
        }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
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

const StatCard = ({ label, value, sub, color = T.accent, icon }) => (
    <div className="card-hover" style={{
        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={icon} size={16} color={color} />
            </div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: T.textSub }}>{sub}</div>}
    </div>
);

// ─── CONFIRM DELETE MODAL ────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onClose }) => (
    <Modal title={title} onClose={onClose} icon={ic.warn} width={400}>
        <p style={{ color: T.textSub, fontSize: 13.5, lineHeight: 1.6, marginBottom: 22 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.bgElevated, color: T.textSub, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
            <button onClick={onConfirm} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: T.red, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .2s' }}>Delete</button>
        </div>
    </Modal>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard({ guestAccess }) {
    const navigate = useNavigate();
    const { token } = useParams();

    const [authUser, setAuthUser] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null);
    const [searchQ, setSearchQ] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Data
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [guestTokens, setGuestTokens] = useState([]);
    const [healthSummary, setHealthSummary] = useState({ totalRecords: 0, totalVitals: 0, totalAnalytics: 0 });
    const [dataLoading, setDataLoading] = useState(false);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    // ── Auth Guard ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const checkAuth = async () => {
            // Guest access via link token
            if (guestAccess && token) {
                const stored = JSON.parse(localStorage.getItem(GUEST_TOKEN_KEY) || '[]');
                const found = stored.find(t => t.token === token && t.active);
                if (found) {
                    setAuthUser({ name: 'Admin Guest', email: 'guest', role: 'guest' });
                    setIsAuthorized(true);
                    setLoading(false);
                    return;
                }
                navigate('/login');
                return;
            }

            // Normal check - look at localStorage
            const raw = localStorage.getItem('userData');
            if (raw) {
                const user = JSON.parse(raw);
                if (user.email === ADMIN_EMAIL || user.role === 'admin') {
                    setAuthUser(user);
                    setIsAuthorized(true);
                    setLoading(false);
                    return;
                }
            }
            navigate('/login');
        };
        checkAuth();
    }, [guestAccess, token, navigate]);

    // ── Fetch Data from Firestore ──────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!isAuthorized) return;
        setDataLoading(true);
        try {
            // Fetch users from SQL Database (New)
            const allUsers = await fetchSqlUsers();
            if (allUsers && allUsers.length > 0) {
              setPatients(allUsers.filter(u => u.role !== 'doctor' && u.role !== 'admin'));
              setDoctors(allUsers.filter(u => u.role === 'doctor'));
            } else {
              // Fallback to Firestore if SQL is empty
              const usersSnap = await getDocs(collection(firestoreDB, 'users'));
              const fsUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              setPatients(fsUsers.filter(u => u.role !== 'doctor' && u.role !== 'admin'));
              setDoctors(fsUsers.filter(u => u.role === 'doctor'));
            }

            // Fetch appointments from SQL API
            try {
                const res = await fetch('/api/admin/appointments');
                if (res.ok) {
                    const apts = await res.json();
                    setAppointments(apts);
                }
            } catch { /* server may not be running */ }

            // Fetch SQL Health Data Summary for Admin
            try {
                const res = await fetch('/api/admin/summary');
                if (res.ok) {
                    const data = await res.json();
                    setHealthSummary(data.summary);
                }
            } catch { }

            // Load guest tokens
            const stored = JSON.parse(localStorage.getItem(GUEST_TOKEN_KEY) || '[]');
            setGuestTokens(stored);
        } catch (err) {
            showToast('Error loading data: ' + err.message, 'error');
        } finally {
            setDataLoading(false);
        }
    }, [isAuthorized]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Delete User ────────────────────────────────────────────────────────────
    const deleteUser = async (userId, userEmail) => {
        try {
            // Remove from Firestore
            await deleteDoc(doc(firestoreDB, 'users', userId));
            
            // Remove from SQL Database
            try {
                await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
            } catch (err) { console.error('SQL Delete failed:', err); }

            setPatients(p => p.filter(u => u.id !== userId || (u.uid && u.uid !== userId)));
            setDoctors(d => d.filter(u => u.id !== userId || (u.uid && u.uid !== userId)));
            showToast(`User ${userEmail} removed from platform`);
        } catch (err) {
            showToast('Delete failed: ' + err.message, 'error');
        } finally {
            setModal(null);
        }
    };

    // ── Generate Guest Link ────────────────────────────────────────────────────
    const generateGuestLink = () => {
        const newToken = uid();
        const newEntry = { token: newToken, created: Date.now(), active: true, label: `Guest Link #${guestTokens.length + 1}` };
        const updated = [...guestTokens, newEntry];
        setGuestTokens(updated);
        localStorage.setItem(GUEST_TOKEN_KEY, JSON.stringify(updated));
        const link = `${window.location.origin}/admin-access/${newToken}`;
        navigator.clipboard.writeText(link).then(() => showToast('Guest link copied to clipboard!')).catch(() => showToast('Link generated! Copy it manually.', 'warn'));
        return link;
    };

    const revokeGuestToken = (token) => {
        const updated = guestTokens.map(t => t.token === token ? { ...t, active: false } : t);
        setGuestTokens(updated);
        localStorage.setItem(GUEST_TOKEN_KEY, JSON.stringify(updated));
        showToast('Guest link revoked');
    };

    // ── Logout ──────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        try { await signOut(auth); } catch { }
        ['authToken', 'token', 'userData', 'user', 'currentUser'].forEach(k => localStorage.removeItem(k));
        navigate('/login');
    };

    // ─── COMPUTED ─────────────────────────────────────────────────────────────
    const filteredPatients = patients.filter(p =>
        (p.displayName || p.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchQ.toLowerCase())
    );
    const filteredDoctors = doctors.filter(d =>
        (d.displayName || d.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(searchQ.toLowerCase())
    );

    // ─── SIDEBAR TABS ─────────────────────────────────────────────────────────
    const tabs = [
        { id: 'overview', label: 'Overview', icon: ic.dash },
        { id: 'patients', label: 'Patients', icon: ic.users },
        { id: 'doctors', label: 'Doctors', icon: ic.doctor },
        { id: 'appointments', label: 'Appointments', icon: ic.activity },
        { id: 'access', label: 'Access Control', icon: ic.key },
        { id: 'settings', label: 'Settings', icon: ic.settings },
    ];

    if (loading) return (
        <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
            <style>{CSS}</style>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, animation: 'spin 1s linear infinite' }} />
            <div style={{ color: T.textSub, fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}>Verifying Admin Access…</div>
        </div>
    );

    if (!isAuthorized) return null;

    const SB_W = sidebarCollapsed ? 64 : 220;

    // ─── PANEL: OVERVIEW ──────────────────────────────────────────────────────
    const OverviewPanel = () => (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
                <StatCard label="Total Patients" value={patients.length} sub="Registered on platform" color={T.blue} icon={ic.users} />
                <StatCard label="Total Doctors" value={doctors.length} sub="Active physicians" color={T.green} icon={ic.doctor} />
                <StatCard label="Appointments" value={appointments.length} sub="All time records" color={T.accent} icon={ic.activity} />
                <StatCard label="Guest Links" value={guestTokens.filter(t => t.active).length} sub="Active access links" color={T.yellow} icon={ic.link} />
            </div>

            {/* Platform Data Summary (SQL) */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📊 Platform Health (SQL Data)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{healthSummary.totalRecords}</div>
                        <div style={{ fontSize: 11, color: '#60a5fa' }}>Health Records</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{healthSummary.totalVitals}</div>
                        <div style={{ fontSize: 11, color: '#60a5fa' }}>Vitals Saved</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{healthSummary.totalAnalytics}</div>
                        <div style={{ fontSize: 11, color: '#60a5fa' }}>AI Analytics Detected</div>
                    </div>
                </div>
            </div>

            {/* Recent Users */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recent Registrations</div>
                    <Badge color={T.accent}>{patients.length + doctors.length} total</Badge>
                </div>
                {[...patients, ...doctors].slice(0, 8).map((u, i) => (
                    <div key={u.id || i} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 10, transition: 'all .15s' }}>
                        <Avatar name={u.displayName || u.name || u.email} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName || u.name || 'Unknown'}</div>
                            <div style={{ fontSize: 11, color: T.textSub, fontFamily: "'JetBrains Mono',monospace" }}>{u.email}</div>
                        </div>
                        <Badge color={u.role === 'doctor' ? T.green : T.blue}>{u.role || 'patient'}</Badge>
                        <div style={{ fontSize: 10.5, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(u.createdAt)}</div>
                    </div>
                ))}
            </div>

            {/* Platform Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>User Distribution</div>
                    {[
                        { label: 'Patients', count: patients.length, color: T.blue },
                        { label: 'Doctors', count: doctors.length, color: T.green },
                        { label: 'Admins', count: 1, color: T.purple },
                    ].map(item => {
                        const total = patients.length + doctors.length + 1 || 1;
                        const pct = Math.round((item.count / total) * 100);
                        return (
                            <div key={item.label} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 12, color: T.textSub }}>{item.label}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono',monospace" }}>{item.count}</span>
                                </div>
                                <div style={{ height: 5, background: T.border, borderRadius: 5 }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 5, transition: 'width .6s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Quick Actions</div>
                    {[
                        { label: 'Refresh Data', icon: ic.refresh, action: fetchData, color: T.accent },
                        { label: 'Generate Guest Link', icon: ic.link, action: generateGuestLink, color: T.yellow },
                        { label: 'View All Patients', icon: ic.users, action: () => setActiveTab('patients'), color: T.blue },
                        { label: 'View All Doctors', icon: ic.doctor, action: () => setActiveTab('doctors'), color: T.green },
                    ].map(item => (
                        <button key={item.label} onClick={item.action} className="btn-primary" style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                            padding: '10px 14px', borderRadius: 10, border: `1px solid ${item.color}25`,
                            background: `${item.color}09`, color: item.color, cursor: 'pointer',
                            fontSize: 12.5, fontWeight: 600, marginBottom: 8, transition: 'all .2s', textAlign: 'left',
                        }}>
                            <Ic d={item.icon} size={15} color={item.color} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // ─── PANEL: USER TABLE (Patients or Doctors) ──────────────────────────────
    const UserTable = ({ data, role }) => {
        const filtered = data.filter(u =>
            (u.displayName || u.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQ.toLowerCase())
        );
        return (
            <div className="fade-in" style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{role === 'doctor' ? 'Registered Doctors' : 'Registered Patients'}</div>
                        <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 2 }}>{filtered.length} {role === 'doctor' ? 'physicians' : 'patients'} found</div>
                    </div>
                    <Badge color={role === 'doctor' ? T.green : T.blue}>{filtered.length} records</Badge>
                </div>
                {dataLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: T.textSub, fontSize: 13 }}>Loading from Firestore…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: 13 }}>No {role}s found{searchQ ? ` matching "${searchQ}"` : ''}</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: T.bgElevated }}>
                                    {['User', 'Email', 'Joined', 'Last Login', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, i) => (
                                    <tr key={u.id || i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, transition: 'all .15s' }}>
                                        <td style={{ padding: '13px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar name={u.displayName || u.name || u.email} size={34} />
                                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.displayName || u.name || 'Unknown'}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 18px' }}>
                                            <div style={{ fontSize: 12, color: T.textSub, fontFamily: "'JetBrains Mono',monospace" }}>{u.email}</div>
                                        </td>
                                        <td style={{ padding: '13px 18px' }}>
                                            <div style={{ fontSize: 11.5, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(u.createdAt)}</div>
                                        </td>
                                        <td style={{ padding: '13px 18px' }}>
                                            <div style={{ fontSize: 11.5, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(u.lastLogin)}</div>
                                        </td>
                                        <td style={{ padding: '13px 18px' }}>
                                            <button
                                                onClick={() => setModal({
                                                    type: 'confirm-delete',
                                                    payload: { userId: u.id, email: u.email || u.displayName || 'this user' }
                                                })}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                                                    borderRadius: 8, border: `1px solid ${T.red}30`, background: `${T.red}10`,
                                                    color: T.red, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, transition: 'all .2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = `${T.red}20`}
                                                onMouseLeave={e => e.currentTarget.style.background = `${T.red}10`}
                                            >
                                                <Ic d={ic.trash} size={13} color={T.red} />
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ─── PANEL: APPOINTMENTS ──────────────────────────────────────────────────
    const AppointmentsPanel = () => (
        <div className="fade-in" style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>All Appointments</div>
                    <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 2 }}>{appointments.length} total records across platform</div>
                </div>
                <Badge color={T.accent}>{appointments.length}</Badge>
            </div>
            {appointments.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: 13 }}>No appointment data available (ensure backend is running)</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: T.bgElevated }}>
                                {['Patient', 'Doctor / Specialist', 'Date', 'Reason', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.slice(0, 50).map((a, i) => {
                                const statusColor = a.status === 'completed' ? T.green : a.status === 'cancelled' ? T.red : a.status === 'missed' ? T.textDim : T.blue;
                                return (
                                    <tr key={a._id || i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, transition: 'all .15s' }}>
                                        <td style={{ padding: '12px 18px', fontSize: 12.5, color: T.text, fontWeight: 600 }}>{a.user?.name || 'Unknown'}</td>
                                        <td style={{ padding: '12px 18px', fontSize: 12, color: T.textSub }}>{a.specialist || a.doctor || '—'}</td>
                                        <td style={{ padding: '12px 18px', fontSize: 11.5, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(a.date)}</td>
                                        <td style={{ padding: '12px 18px', fontSize: 12, color: T.textSub }}>{a.reason?.slice(0, 30) || '—'}</td>
                                        <td style={{ padding: '12px 18px' }}><Badge color={statusColor}>{a.status || 'scheduled'}</Badge></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // ─── PANEL: ACCESS CONTROL ────────────────────────────────────────────────
    const AccessPanel = () => {
        const [newLabel, setNewLabel] = useState('');
        return (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Generate new link */}
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px 26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.yellowBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ic d={ic.key} size={16} color={T.yellow} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Generate Guest Access Link</div>
                            <div style={{ fontSize: 11.5, color: T.textSub }}>Share a one-time link so someone can access the admin panel</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="Label e.g. 'For Dr. Ravi'"
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.bgElevated, color: T.text, fontSize: 13 }}
                        />
                        <button onClick={() => { generateGuestLink(); setNewLabel(''); }} className="btn-primary" style={{
                            padding: '10px 18px', borderRadius: 10, border: 'none', background: T.yellow, color: '#111', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, transition: 'all .2s',
                        }}>
                            <Ic d={ic.link} size={15} color="#111" /> Generate & Copy
                        </button>
                    </div>
                </div>

                {/* Active tokens */}
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Guest Access Links</div>
                        <Badge color={T.yellow}>{guestTokens.filter(t => t.active).length} active</Badge>
                    </div>
                    {guestTokens.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: T.textDim, fontSize: 13 }}>No guest links generated yet</div>
                    ) : (
                        guestTokens.map((gt, i) => {
                            const link = `${window.location.origin}/admin-access/${gt.token}`;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${T.border}`, opacity: gt.active ? 1 : 0.5 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: gt.active ? T.greenBg : T.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ic d={gt.active ? ic.check : ic.x} size={15} color={gt.active ? T.green : T.textDim} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{gt.label}</div>
                                        <div style={{ fontSize: 10.5, color: T.textDim, fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</div>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{fmt(gt.created)}</div>
                                    {gt.active && (
                                        <>
                                            <button onClick={() => navigator.clipboard.writeText(link).then(() => showToast('Copied!')).catch(() => { })} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgElevated, color: T.textSub, cursor: 'pointer' }}>
                                                <Ic d={ic.copy} size={13} />
                                            </button>
                                            <button onClick={() => revokeGuestToken(gt.token)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.red}30`, background: `${T.red}10`, color: T.red, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>Revoke</button>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    // ─── PANEL: SETTINGS ──────────────────────────────────────────────────────
    const SettingsPanel = () => (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
                { title: 'Admin Email', sub: ADMIN_EMAIL, color: T.accent, icon: ic.shield },
                { title: 'Platform Version', sub: 'MediPredict v4.0 — Admin Edition', color: T.green, icon: ic.activity },
                { title: 'Firestore Connection', sub: 'Connected', color: T.green, icon: ic.check },
                { title: 'Guest Links Active', sub: `${guestTokens.filter(t => t.active).length} links`, color: T.yellow, icon: ic.link },
            ].map((item, i) => (
                <div key={i} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ic d={item.icon} size={17} color={item.color} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.title}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginTop: 2 }}>{item.sub}</div>
                    </div>
                </div>
            ))}

            <div style={{ background: T.bgCard, border: `1px solid ${T.red}25`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 6 }}>Danger Zone</div>
                <div style={{ fontSize: 12.5, color: T.textSub, marginBottom: 16 }}>These actions are irreversible. Proceed with extreme caution.</div>
                <button onClick={() => setModal({ type: 'confirm-delete-all' })} style={{
                    padding: '10px 18px', borderRadius: 10, border: `1px solid ${T.red}40`,
                    background: `${T.red}10`, color: T.red, cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .2s',
                }}>Revoke All Guest Links</button>
            </div>
        </div>
    );

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', fontFamily: "'Space Grotesk',sans-serif", color: T.text }}>
            <style>{CSS}</style>

            {/* ── SIDEBAR ── */}
            <aside style={{
                width: SB_W, minHeight: '100vh', background: T.bgCard, borderRight: `1px solid ${T.border}`,
                display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
                transition: 'width .25s ease', flexShrink: 0, zIndex: 10,
            }}>
                {/* Logo */}
                <div style={{ padding: sidebarCollapsed ? '20px 14px' : '20px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setSidebarCollapsed(c => !c)}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},${T.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ic d={ic.shield} size={17} color="#fff" />
                    </div>
                    {!sidebarCollapsed && <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>Admin Panel</div>}
                </div>

                {/* Admin User */}
                {!sidebarCollapsed && (
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${T.accent}40,${T.purple}40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: T.accent, fontSize: 13, flexShrink: 0 }}>
                            {initials(authUser?.name || 'AD')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser?.name || 'Admin'}</div>
                            <div style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>
                                {authUser?.role === 'guest' ? 'Guest Admin' : 'Super Admin'}
                            </div>
                        </div>
                        <Badge color={T.accent}>{authUser?.role === 'guest' ? 'Guest' : 'Admin'}</Badge>
                    </div>
                )}

                {/* Tabs */}
                <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} className="nav-btn" onClick={() => setActiveTab(tab.id)} style={{
                                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                padding: sidebarCollapsed ? '10px' : '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: active ? T.accentSoft : 'transparent',
                                color: active ? T.accent : T.textSub, fontWeight: active ? 700 : 500, fontSize: 13,
                                transition: 'all .15s', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            }}>
                                <Ic d={tab.icon} size={16} color={active ? T.accent : T.textSub} />
                                {!sidebarCollapsed && tab.label}
                                {active && !sidebarCollapsed && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: T.accent }} />}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div style={{ padding: '12px 10px', borderTop: `1px solid ${T.border}` }}>
                    <button onClick={handleLogout} className="nav-btn" style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: sidebarCollapsed ? '10px' : '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'transparent', color: T.red, fontWeight: 600, fontSize: 13,
                        transition: 'all .15s', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}>
                        <Ic d={ic.out} size={16} color={T.red} />
                        {!sidebarCollapsed && 'Logout'}
                    </button>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Topbar */}
                <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 9 }}>
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>
                            {tabs.find(t => t.id === activeTab)?.label}
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>
                            MediPredict Admin — Full Control Panel
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 14px', maxWidth: 360, marginLeft: 'auto' }}>
                        <Ic d={ic.search} size={15} color={T.textDim} />
                        <input
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                            placeholder="Search users, doctors…"
                            style={{ flex: 1, background: 'none', border: 'none', color: T.text, fontSize: 13, outline: 'none', fontFamily: "'Space Grotesk',sans-serif" }}
                        />
                    </div>

                    <button onClick={fetchData} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.bgElevated, color: T.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600 }}>
                        <Ic d={ic.refresh} size={14} color={T.textSub} />
                        Refresh
                    </button>

                    {/* Status dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, background: T.greenBg, border: `1px solid ${T.green}25` }}>
                        <div className="pulsing" style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.green }}>Live</span>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
                    {activeTab === 'overview' && <OverviewPanel />}
                    {activeTab === 'patients' && <UserTable data={filteredPatients} role="patient" />}
                    {activeTab === 'doctors' && <UserTable data={filteredDoctors} role="doctor" />}
                    {activeTab === 'appointments' && <AppointmentsPanel />}
                    {activeTab === 'access' && <AccessPanel />}
                    {activeTab === 'settings' && <SettingsPanel />}
                </div>
            </main>

            {/* ── MODALS ── */}
            {modal?.type === 'confirm-delete' && (
                <ConfirmModal
                    title="Remove User"
                    message={`Are you sure you want to permanently remove "${modal.payload.email}" from the database? This action cannot be undone.`}
                    onConfirm={() => deleteUser(modal.payload.userId, modal.payload.email)}
                    onClose={() => setModal(null)}
                />
            )}
            {modal?.type === 'confirm-delete-all' && (
                <ConfirmModal
                    title="Revoke All Guest Links"
                    message="This will immediately revoke all active guest access links. Anyone using a guest link will be blocked."
                    onConfirm={() => {
                        const updated = guestTokens.map(t => ({ ...t, active: false }));
                        setGuestTokens(updated);
                        localStorage.setItem(GUEST_TOKEN_KEY, JSON.stringify(updated));
                        showToast('All guest links revoked');
                        setModal(null);
                    }}
                    onClose={() => setModal(null)}
                />
            )}

            {/* ── TOAST ── */}
            {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
