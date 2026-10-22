import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { AnimatePresence, MotionConfig, animate as animateValue, motion, useReducedMotion } from 'framer-motion';
import ProfileMenu from './ProfileMenu.jsx';
import { AppSplashScreen, PredictionLoader } from './LoadingScreens.jsx';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CloudUpload, Database,
  Download, FileSpreadsheet, Filter, Gauge, History, Home, Layers3, LineChart, LoaderCircle,
  LogOut, Menu, Package, PanelLeftClose, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  Moon, Sparkles, Sun, Target, TrendingUp, Upload, WandSparkles, X, Zap
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart as ReLineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import './styles.css';
import './motion.css';
import './dark-theme.css';
import './theme-system.css';
import './motion-polish.css';
import './loading-system.css';
import './demandx-animation.css';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AuthContext = createContext(null);
const ThemeContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const useTheme = () => useContext(ThemeContext);
const motionEase = [0.22, 1, 0.36, 1];

function AnimatedValue({ value, className }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const animatedOnce = React.useRef(false);
  const text = String(value ?? '—');
  const match = text.match(/^(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[1].replaceAll(',', '')) : null;
  const suffix = match?.[2] || '';
  const decimals = match?.[1].split('.')[1]?.length || 0;

  useEffect(() => {
    if (target === null || !Number.isFinite(target)) {
      setDisplay(text);
      return undefined;
    }
    if (animatedOnce.current || reduceMotion) {
      animatedOnce.current = true;
      setDisplay(text);
      return undefined;
    }
    let controls;
    const frame = requestAnimationFrame(() => {
      if (animatedOnce.current) return;
      animatedOnce.current = true;
      controls = animateValue(0, target, {
        duration: 0.72,
        ease: 'easeOut',
        onUpdate: current => setDisplay(`${current.toLocaleString('en', { maximumFractionDigits: decimals })}${suffix}`),
        onComplete: () => setDisplay(text),
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      controls?.stop();
    };
  }, [decimals, reduceMotion, suffix, target, text]);

  return <span className={className} aria-label={text} aria-live="off">{display}</span>;
}
function useChartMotion() {
  const reduceMotion = useReducedMotion();
  return useMemo(() => reduceMotion ? { isAnimationActive: false } : { isAnimationActive: true, animationDuration: 620 }, [reduceMotion]);
}
function AmbientBackground({ login = false }) {
  const rootRef = useRef(null);
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerMedia = window.matchMedia('(pointer: fine) and (min-width: 900px)');
    let frame = 0;
    const updatePointer = event => {
      if (reducedMotion.matches || !pointerMedia.matches || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const root = rootRef.current;
        if (!root) return;
        const x = ((event.clientX / window.innerWidth) - .5) * 26;
        const y = ((event.clientY / window.innerHeight) - .5) * 26;
        root.style.setProperty('--pointer-x', `${x.toFixed(1)}px`);
        root.style.setProperty('--pointer-y', `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', updatePointer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  const particles = [
    [12, 19], [24, 73], [37, 32], [48, 84], [61, 17], [73, 59], [84, 28], [91, 76],
  ];
  return <div ref={rootRef} className={login ? 'login-atmosphere' : 'motion-atmosphere'} aria-hidden="true">
    {login ? <>
      <span className="login-orb login-orb-one"/>
      <span className="login-orb login-orb-two"/>
      <span className="login-orb login-orb-three"/>
      {particles.map(([left, top], index) => <span key={`${left}-${top}`} className="login-particle" style={{ left: `${left}%`, top: `${top}%`, '--particle-delay': `${index * -1.7}s` }}/>)}
      <span className="login-grid"/>
    </> : <>
      <span className="atmosphere-orb orb-a"/>
      <span className="atmosphere-orb orb-b"/>
      <span className="atmosphere-orb orb-c"/>
      <span className="atmosphere-grid"/>
      <span className="atmosphere-grain"/>
    </>}
    <span className="ambient-pointer"/>
  </div>;
}
function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const setTheme = (nextTheme) => {
    document.documentElement.dataset.theme = nextTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextTheme === 'dark' ? '#101c19' : '#f3f6f3');
    try { localStorage.setItem('demandx_theme', nextTheme); } catch { /* Theme still applies for this session. */ }
    setThemeState(nextTheme);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101c19' : '#f3f6f3');
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  const label = `Switch to ${nextTheme} mode`;
  return <button type="button" className={`theme-toggle icon-btn ${className}`} aria-label={label} title={label} aria-pressed={theme === 'light'} onClick={() => setTheme(nextTheme)}><AnimatePresence mode="wait" initial={false}><motion.span key={theme} aria-hidden="true" initial={{ opacity: 0, rotate: -35, scale: .7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 35, scale: .7 }} transition={{ duration: .16 }}><Icon size={18}/></motion.span></AnimatePresence></button>;
}
const nav = [
  { id: 'overview', label: 'Overview', group: 'WORKSPACE', icon: Home },
  { id: 'data', label: 'Data workspace', group: 'WORKSPACE', icon: Database },
  { id: 'insights', label: 'Demand insights', group: 'ANALYTICS', icon: BarChart3 },
  { id: 'forecast', label: 'Forecast studio', group: 'ANALYTICS', icon: Target },
  { id: 'daywise', label: 'Day-wise prediction', group: 'ANALYTICS', icon: CalendarDays },
  { id: 'models', label: 'Model lab', group: 'ANALYTICS', icon: Activity },
  { id: 'history', label: 'Forecast history', group: 'MANAGE', icon: History },
];
function pageFromPath(pathname) {
  const requested = pathname.replace(/\/+$/, '').split('/').pop();
  return nav.some(item => item.id === requested) ? requested : 'overview';
}
function offsetDate(value, days) {
  if (!value) return undefined;
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

async function api(path, options = {}) {
  const token = sessionStorage.getItem('demandx_google_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}
const fmt = (v) => Number(v || 0).toLocaleString('en', { maximumFractionDigits: 1 });
const fmtCount = (v) => Number(v || 0).toLocaleString('en', { maximumFractionDigits: 0 });
const formatMeasure = (value, measure) => /order|count|qty|quantity|units/i.test(measure || '') ? fmtCount(value) : fmt(value);
const compact = (v) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v || 0));
const dateLabel = (s) => s ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—';
const colors = ['#6dd8a3', '#8cb8ff', '#f2c879', '#b4a2ff', '#f29c9c', '#72d5d0'];

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem('demandx_google_token')));
  useEffect(() => {
    const token = sessionStorage.getItem('demandx_google_token');
    if (!token) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let cancelled = false;
    api('/api/me', { signal: controller.signal })
      .then(profile => { if (!cancelled) setUser(profile); })
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem('demandx_google_token');
        setUser(null);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  const signIn = async (credential) => {
    sessionStorage.setItem('demandx_google_token', credential);
    try { const profile = await api('/api/me'); setUser(profile); return profile; }
    catch (e) { sessionStorage.removeItem('demandx_google_token'); throw e; }
  };
  const signOut = () => { sessionStorage.removeItem('demandx_google_token'); setUser(null); };
  const saveProfile = async (profile) => { const updated = await api('/api/me', { method: 'PUT', body: JSON.stringify(profile) }); setUser(updated); return updated; };
  return <AuthContext.Provider value={{ user, loading, signIn, signOut, saveProfile }}>{children}</AuthContext.Provider>;
}


const brandLetters = ['D', 'e', 'm', 'a', 'n', 'd', 'X'];
const fallingParcels = [
  { emoji: '📦', left: '7%', delay: 0.1, duration: 2.7, size: 30 },
  { emoji: '🛍️', left: '18%', delay: 0.55, duration: 3.1, size: 26 },
  { emoji: '📦', left: '29%', delay: 0.25, duration: 2.9, size: 34 },
  { emoji: '🧃', left: '41%', delay: 0.85, duration: 3.2, size: 25 },
  { emoji: '📦', left: '53%', delay: 0.35, duration: 2.8, size: 32 },
  { emoji: '🛒', left: '65%', delay: 0.7, duration: 3.0, size: 29 },
  { emoji: '📦', left: '77%', delay: 0.15, duration: 3.15, size: 34 },
  { emoji: '🛍️', left: '89%', delay: 0.95, duration: 2.75, size: 27 },
];

function BrandIntroScreen({ label = 'Preparing your workspace' }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className="dx-intro-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="dx-intro-glow dx-intro-glow-one" />
      <div className="dx-intro-glow dx-intro-glow-two" />
      <motion.div className="dx-intro-mark" initial={{ opacity: 0, scale: 0.55, rotate: -12, filter: 'blur(12px)' }} animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }} transition={{ duration: reduceMotion ? 0.1 : 0.8, ease: motionEase }}>
        D
      </motion.div>
      <motion.div className="dx-intro-wordmark" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.65, duration: 0.5, ease: motionEase }} aria-label="DemandX">
        {brandLetters.map((letter, index) => (
          <motion.span key={`${letter}-${index}`} initial={{ opacity: 0, y: 18, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: reduceMotion ? 0 : 0.78 + index * 0.075, duration: 0.38, ease: motionEase }} className={letter === 'X' ? 'dx-intro-x' : ''}>{letter}</motion.span>
        ))}
      </motion.div>
      <motion.div className="dx-intro-tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 1.45, duration: 0.5 }}>PREDICT. PLAN. GROW.</motion.div>
      <motion.div className="dx-intro-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.3 }}><span /><span /><span /></motion.div>
      <p className="dx-intro-status">{label}</p>
    </motion.div>
  );
}

function WelcomeToDemandX({ user, onFinish }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timeout = window.setTimeout(onFinish, reduceMotion ? 900 : 3100);
    return () => window.clearTimeout(timeout);
  }, [onFinish, reduceMotion]);
  return (
    <motion.div className="dx-welcome-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={onFinish} role="dialog" aria-label="Welcome to DemandX">
      <div className="dx-welcome-grid" />
      {!reduceMotion && fallingParcels.map((parcel, index) => (
        <motion.span key={index} className="dx-falling-parcel" style={{ left: parcel.left, fontSize: parcel.size }} initial={{ y: '-15vh', opacity: 0, rotate: -18 }} animate={{ y: '115vh', opacity: [0, 1, 1, 0.85], rotate: 22 }} transition={{ delay: parcel.delay, duration: parcel.duration, ease: 'linear' }} aria-hidden="true">{parcel.emoji}</motion.span>
      ))}
      <motion.div className="dx-welcome-card" initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.65, ease: motionEase }}>
        <motion.div className="dx-welcome-icon" initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 12 }}>D<span>X</span></motion.div>
        <div className="dx-welcome-kicker">YOUR DEMAND INTELLIGENCE WORKSPACE</div>
        <h1>Welcome to <span>DemandX</span></h1>
        <p>{user?.name ? `Great to have you here, ${user.name.split(' ')[0]}.` : 'Your next-level demand planning workspace is ready.'}</p>
        <div className="dx-welcome-chips"><span>📦 Order insights</span><span>📈 Smart forecasts</span><span>✨ Better decisions</span></div>
        <div className="dx-welcome-progress"><span /></div>
        <button className="dx-welcome-skip" onClick={(event) => { event.stopPropagation(); onFinish(); }}>Enter workspace <span>→</span></button>
      </motion.div>
    </motion.div>
  );
}

function App() {
  const auth = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [introElapsed, setIntroElapsed] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setIntroElapsed(true), 2250); return () => window.clearTimeout(timer); }, []);
  const previousUserRef = useRef(Boolean(auth.user));
  const finishWelcome = React.useCallback(() => setShowWelcome(false), []);
  useEffect(() => {
    const signedIn = Boolean(auth.user);
    if (signedIn && !previousUserRef.current && !auth.loading) setShowWelcome(true);
    previousUserRef.current = signedIn;
  }, [auth.user, auth.loading]);
  const [page, setPageState] = useState(() => pageFromPath(window.location.pathname));
  const [visitedPages, setVisitedPages] = useState(() => [pageFromPath(window.location.pathname)]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [datasetsReady, setDatasetsReady] = useState(false);
  const [datasetsError, setDatasetsError] = useState('');
  const [activeDataset, setActiveDataset] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [health, setHealth] = useState({ google_login_configured: false });
  const [healthReady, setHealthReady] = useState(false);
  const setPage = (nextPage) => {
    const pageId = nav.some(item => item.id === nextPage) ? nextPage : 'overview';
    setPageState(pageId);
    setVisitedPages(current => current.includes(pageId) ? current : [...current, pageId]);
    const path = pageId === 'overview' ? '/' : `/${pageId}`;
    if (window.location.pathname !== path) window.history.pushState({ page: pageId }, '', path);
  };
  useEffect(() => {
    const syncPage = () => {
      const pageId = pageFromPath(window.location.pathname);
      setPageState(pageId);
      setVisitedPages(current => current.includes(pageId) ? current : [...current, pageId]);
    };
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);
  const notify = (message, kind = 'success') => { setToast({ message, kind }); window.setTimeout(() => setToast(null), 4200); };
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1800);
    let cancelled = false;
    fetch(`${API}/api/health`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Health check failed (${response.status})`);
        return response.json();
      })
      .then(setHealth)
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setHealthReady(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!auth.user) {
      setDatasets([]);
      setActiveDataset(null);
      setDatasetsError('');
      setDatasetsReady(false);
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    api('/api/datasets', { signal: controller.signal })
      .then(list => {
        if (cancelled) return;
        setDatasets(list);
        setDatasetsError('');
        if (activeDataset && !list.some(d => d.id === activeDataset.id)) setActiveDataset(null);
      })
      .catch(e => {
        if (cancelled) return;
        const message = e.name === 'AbortError' ? 'Dataset loading timed out. Check the backend connection and retry.' : e.message;
        setDatasetsError(message);
        notify(message, 'error');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setDatasetsReady(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [auth.user, refreshKey]);
  const refresh = () => setRefreshKey(k => k + 1);
  const renderPage = pageId => {
    if (pageId === 'overview') return <Overview {...shared} user={auth.user} datasetsLoading={!datasetsReady} datasetsError={datasetsError}/>;
    if (pageId === 'data') return <DataWorkspace {...shared}/>;
    if (pageId === 'insights') return <Insights {...shared}/>;
    if (pageId === 'forecast') return <ForecastStudio {...shared}/>;
    if (pageId === 'daywise') return <DaywisePrediction {...shared}/>;
    if (pageId === 'models') return <ModelLab {...shared}/>;
    if (pageId === 'history') return <HistoryPage {...shared}/>;
    return null;
  };
  const initializing = auth.loading || !healthReady || !introElapsed;
  const activeNav = nav.find(n => n.id === page) || nav[0];
  const shared = { datasets, activeDataset, setActiveDataset, refresh, notify, setPage };
  return <>
    <AnimatePresence>
      {initializing && <BrandIntroScreen key="app-splash" label={auth.loading ? 'Restoring your secure session' : 'Preparing your workspace'}/>}
    </AnimatePresence>
    <AnimatePresence>{!initializing && auth.user && showWelcome && <WelcomeToDemandX key="dx-welcome" user={auth.user} onFinish={finishWelcome}/>}</AnimatePresence>
    {!initializing && (auth.user ? <div className="app-shell">
    <AmbientBackground/>
    <Sidebar page={page} setPage={setPage} user={auth.user} signOut={auth.signOut} open={sidebarOpen} close={() => setSidebarOpen(false)} />
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu icon-btn" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button>
        <div className="breadcrumbs"><span>DemandX</span><ChevronRight size={14}/><strong>{activeNav.label}</strong></div>
        <div className="topbar-right"><div className="status-pill"><span className="status-dot"/> Workspace ready</div><button className="icon-btn notification" aria-label="Notifications" onClick={() => notify('You are all caught up.')}><Bell size={18}/></button><ThemeToggle/><ProfileMenu user={auth.user} onSave={auth.saveProfile} signOut={auth.signOut}/></div>
      </header>
      <main className="page-content"><div className="page-stack">
        {visitedPages.map(pageId => {
          const active = pageId === page;
          return <motion.div key={pageId} className="page-route" initial={{ opacity: 0, y: 8, scale: .995 }} animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: .998 }} transition={{ duration: 0.28, ease: motionEase }} style={{ position: active ? 'relative' : 'absolute', inset: active ? 'auto' : 0, width: '100%', pointerEvents: active ? 'auto' : 'none', zIndex: active ? 1 : 0 }} aria-hidden={!active} inert={!active}>
            {renderPage(pageId)}
          </motion.div>;
        })}
      </div></main>
      <footer className="footer"><span>DemandX <span className="footer-dot">·</span> Demand intelligence for better decisions</span><span><ShieldCheck size={13}/> Your workspace is private</span></footer>
    </div>
    <AnimatePresence>{toast && <motion.div className={`toast ${toast.kind}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span className="toast-icon">{toast.kind === 'error' ? <X size={16}/> : <Check size={16}/>}</span>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15}/></button></motion.div>}</AnimatePresence>
    </div> : <LoginScreen health={health} onSignIn={auth.signIn} notify={notify}/>)}
  </>;
}
function initials(name = 'User') { return name.split(' ').filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase(); }

function LoginScreen({ health, onSignIn, notify }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [busy, setBusy] = useState(false);
  const [signError, setSignError] = useState('');
  const doSignIn = async (response) => {
    setBusy(true); setSignError('');
    try { await onSignIn(response.credential); }
    catch (e) { setSignError(e.message || 'Google sign-in could not be verified.'); }
    finally { setBusy(false); }
  };
  return <motion.div className="login-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
    <AmbientBackground login/>
    <motion.div className="login-left" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .06, ease: motionEase }}>
      <motion.div className="brand-lockup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .12, ease: motionEase }}><motion.div className="brand-mark" initial={{ opacity: 0, scale: .86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55, delay: .12, ease: motionEase }}><Activity size={22}/></motion.div><span>Demand<span className="brand-x">X</span></span></motion.div>
      <motion.div className="login-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .18, ease: motionEase }}><motion.div className="eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .22, ease: motionEase }}><span className="eyebrow-line"/> INTELLIGENCE FOR WHAT'S NEXT</motion.div><h1><motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .3, ease: motionEase }}>See </motion.span><motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .38, ease: motionEase }}>demand</motion.span><br/><motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .46, ease: motionEase }}>before </motion.span><motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .54, ease: motionEase }}>it </motion.span><motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .48, delay: .62, ease: motionEase }}>arrives.</motion.span></h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, delay: .68, ease: motionEase }}>Turn your order data into clearer decisions. Explore patterns, test models, and forecast product demand for the day that matters.</motion.p><motion.div className="login-proof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .44, delay: .82, ease: motionEase }}><div className="proof-icon"><TrendingUp size={19}/></div><div><strong>From raw data to a clearer plan</strong><span>One connected workspace for your demand workflow.</span></div></motion.div></motion.div>
      <motion.div className="login-bottom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: 1.05 }}><span>2026 DemandX</span><span>Built for thoughtful planning</span></motion.div>
    </motion.div>
    <motion.div className="login-right" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, delay: .38, ease: motionEase }}><ThemeToggle className="login-theme-toggle"/><motion.div className="login-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .52, delay: .48, ease: motionEase }}>
      <div className="login-card-icon"><Sparkles size={21}/></div><div className="login-card-eyebrow">YOUR DEMAND WORKSPACE</div><h2>Welcome back.</h2><p>Sign in to open your private workspace and continue where you left off.</p>
      {clientId ? <motion.div className={`google-wrap ${busy ? 'is-busy' : ''}`} aria-busy={busy} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .44, delay: .88, ease: motionEase }} whileHover={{ scale: 1.012 }} whileTap={{ scale: .988 }}><GoogleLogin onSuccess={doSignIn} onError={() => setSignError('Google sign-in was cancelled or could not start.')} theme="outline" shape="rectangular" size="large" text="continue_with" width="320" />{busy && <motion.div className="google-verifying" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} role="status"><LoaderCircle size={15} className="spin"/> Verifying your Google account…</motion.div>}</motion.div> : <motion.div className="setup-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .44, delay: .88, ease: motionEase }}><div className="setup-notice-head"><Settings2 size={17}/><strong>Google sign-in setup required</strong></div><p>Add your Google OAuth Web Client ID to <code>frontend/.env</code> as <code>VITE_GOOGLE_CLIENT_ID</code>, then restart the frontend. See the README for the exact steps.</p></motion.div>}
      <AnimatePresence initial={false}>{signError && <motion.div className="inline-error" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}>{signError}</motion.div>}</AnimatePresence>
      <motion.div className="login-divider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: 1.02 }}><span/> <small>SECURE ACCESS</small> <span/></motion.div><motion.div className="secure-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: 1.08 }}><ShieldCheck size={16}/><span>Verified Google account · Private data workspace</span></motion.div><motion.div className="login-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: 1.14 }}>Your datasets are stored under your account. DemandX never asks for your Google password.</motion.div>
    </motion.div><motion.div className="login-footnote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4, delay: 1.1 }}><CircleHelp size={14}/> Having trouble? Check your OAuth client setup in the project README.</motion.div></motion.div>
    <motion.div className="login-decor decor-one" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .9, delay: .1 }}/><motion.div className="login-decor decor-two" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .9, delay: .22 }}/>
  </motion.div>;
}

function Sidebar({ page, setPage, user, signOut, open, close }) {
  const groups = [...new Set(nav.map(n => n.group))];
  return <><div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={close}/><aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <div className="sidebar-brand"><div className="brand-mark"><Activity size={20}/></div><span>Demand<span className="brand-x">X</span></span><button className="sidebar-close icon-btn" onClick={close} aria-label="Close navigation"><X size={18}/></button></div>
    <div className="workspace-switcher"><div className="workspace-symbol"><Layers3 size={16}/></div><div><strong>My workspace</strong><span>Personal workspace</span></div><ChevronDown size={15} className="muted-icon"/></div>
    <nav className="side-nav" aria-label="Main navigation">{groups.map(group => <div className="nav-group" key={group}><div className="nav-group-label">{group}</div>{nav.filter(n => n.group === group).map(item => { const Icon = item.icon; const index = nav.findIndex(entry => entry.id === item.id); return <motion.button key={item.id} layout className={`nav-item ${page === item.id ? 'active' : ''}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .28, delay: .08 + index * .04, ease: motionEase }} whileHover={{ x: 3 }} whileTap={{ scale: .985 }} onClick={() => { setPage(item.id); close(); }}>{page === item.id && <motion.span className="nav-active-indicator" layoutId="nav-active-indicator" transition={{ type: 'spring', bounce: 0, duration: .34 }}/>}<motion.span className="nav-icon"><Icon size={18}/></motion.span><span>{item.label}</span>{item.id === 'forecast' && <span className="nav-new">NEW</span>}</motion.button>; })}</div>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Zap size={17}/></div><strong>Better forecasts start with good data.</strong><span>Upload your latest order history to get going.</span><button onClick={() => { setPage('data'); close(); }}>Open data workspace <ArrowRight size={14}/></button></div><div className="sidebar-user"><div className="avatar small">{user.picture ? <img src={user.picture} alt=""/> : initials(user.name)}</div><div className="user-info"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-btn signout-btn" title="Sign out" onClick={signOut}><LogOut size={16}/></button></div></div>
  </aside></>;
}
function PageHeader({ eyebrow, title, description, actions }) { return <div className="page-header"><div><div className="section-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</div>; }
function Button({ children, variant = 'primary', onClick, disabled, icon: Icon, type = 'button', className = '' }) { return <button type={type} disabled={disabled} onClick={onClick} className={`btn ${variant} ${className}`}>{Icon && <Icon size={16}/>}<span>{children}</span></button>; }
function EmptyState({ icon: Icon = Database, title, description, action, onAction }) { return <div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><h3>{title}</h3><p>{description}</p>{action && <Button onClick={onAction} icon={Plus}>{action}</Button>}</div>; }
function StatCard({ label, value, note, icon: Icon, trend, tint = 'mint' }) { const reduceMotion = useReducedMotion(); return <motion.div className="stat-card-motion" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -4, rotateX: 1.25, rotateY: -.5 }} viewport={{ once: true, amount: .25 }} transition={{ type: 'spring', bounce: 0, duration: .42 }} style={{ transformPerspective: 900 }}><div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tint}`}><Icon size={18}/></div></div><div className="stat-value"><AnimatedValue value={value}/></div><div className="stat-bottom"><span>{note}</span>{trend && <span className="stat-trend"><ArrowUpRight size={13}/>{trend}</span>}</div></div></motion.div>; }
function ChartCard({ title, subtitle, children, action }) { return <section className="panel chart-card"><div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>{children}</section>; }
function Select({ label, value, onChange, options, placeholder = 'Choose a column', disabled = false }) { return <label className="field"><span>{label}</span><div className="select-wrap"><select value={value || ''} onChange={e => onChange(e.target.value || null)} disabled={disabled}><option value="">{placeholder}</option>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select><ChevronDown size={15}/></div></label>; }
function TextInput({ label, value, onChange, type = 'text', min, max, helper }) { return <label className="field"><span>{label}</span><input type={type} value={value} min={min} max={max} onChange={e => onChange(e.target.value)} />{helper && <small>{helper}</small>}</label>; }
function ProductInput({ label, value, onChange, options, helper }) { const id = React.useId(); return <label className="field"><span>{label}</span><input list={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Type or choose a product" autoComplete="off"/><datalist id={id}>{(options || []).map(v => <option key={String(v)} value={String(v)}/>)}</datalist>{helper && <small>{helper}</small>}</label>; }
function DatasetPicker({ datasets, activeDataset, setActiveDataset, disabled = false }) { return <div className="dataset-picker"><FileSpreadsheet size={16}/><select aria-label="Active dataset" value={activeDataset?.id || ''} disabled={disabled} onChange={e => setActiveDataset(datasets.find(d => d.id === e.target.value) || null)}><option value="">Select dataset…</option>{datasets.map(d => <option value={d.id} key={d.id}>{d.filename}</option>)}</select><ChevronDown size={14}/></div>; }

const parcelBurstBits = [
  { x: -92, y: -64, r: -28, glyph: '✦' }, { x: -58, y: -104, r: 24, glyph: '•' },
  { x: -18, y: -122, r: -18, glyph: '✧' }, { x: 34, y: -112, r: 32, glyph: '•' },
  { x: 83, y: -78, r: 18, glyph: '✦' }, { x: 106, y: -24, r: -34, glyph: '•' },
  { x: 91, y: 43, r: 24, glyph: '✧' }, { x: 48, y: 83, r: -24, glyph: '•' },
  { x: -18, y: 92, r: 34, glyph: '✦' }, { x: -76, y: 54, r: -18, glyph: '•' },
  { x: -108, y: 2, r: 26, glyph: '✧' }, { x: 8, y: 42, r: 180, glyph: '📦' },
];
function DashboardParcelPlayground({ onExplore }) {
  const reduceMotion = useReducedMotion();
  const [burst, setBurst] = useState(false);
  const [count, setCount] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  const popBoxes = () => {
    setCount(v => v + 1);
    setBurst(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBurst(false), reduceMotion ? 120 : 1150);
  };
  return <section className={`dx-parcel-playground ${burst ? 'is-bursting' : ''}`} aria-label="Interactive parcel animation">
    <div className="dx-parcel-copy"><span className="dx-parcel-eyebrow"><span className="dx-parcel-live-dot"/> A LITTLE DASHBOARD MAGIC</span><h2>Make demand <em>move.</em></h2><p>Tap the parcel stack and watch your orders scatter. Your data stays right where it is.</p><div className="dx-parcel-actions"><button type="button" className="dx-parcel-cta" onClick={popBoxes}><span>{burst ? 'Again!' : 'Pop the boxes'}</span><span aria-hidden="true">✦</span></button><button type="button" className="dx-parcel-text-action" onClick={onExplore}>Explore insights <span aria-hidden="true">↗</span></button></div></div>
    <div className="dx-parcel-stage">
      <div className="dx-parcel-orbit dx-parcel-orbit-one"/><div className="dx-parcel-orbit dx-parcel-orbit-two"/>
      <div className="dx-parcel-confetti" aria-hidden="true">{!reduceMotion && burst && parcelBurstBits.map((bit, i) => <motion.span key={`${count}-${i}`} initial={{ x: 0, y: 0, opacity: 1, scale: .4, rotate: 0 }} animate={{ x: bit.x, y: bit.y, opacity: 0, scale: bit.glyph === '📦' ? 1.1 : 1.6, rotate: bit.r }} transition={{ duration: .95, ease: 'easeOut' }} className={`dx-burst-bit dx-burst-bit-${i % 4}`}>{bit.glyph}</motion.span>)}</div>
      <motion.button type="button" className={`dx-parcel-stack ${burst ? 'stack-burst' : ''}`} onClick={popBoxes} aria-label="Pop the stacked parcel boxes" whileHover={reduceMotion ? undefined : { y: -5, rotate: -2, scale: 1.035 }} whileTap={reduceMotion ? undefined : { scale: .94 }}>
        <motion.span className="dx-parcel-box box-back" animate={burst && !reduceMotion ? { x: 76, y: -42, rotate: 24, opacity: 0 } : { x: 0, y: 0, rotate: 8, opacity: 1 }} transition={{ duration: .42, ease: 'backOut' }}><i/><b/></motion.span>
        <motion.span className="dx-parcel-box box-mid" animate={burst && !reduceMotion ? { x: -82, y: -20, rotate: -27, opacity: 0 } : { x: 0, y: 0, rotate: -7, opacity: 1 }} transition={{ duration: .4, ease: 'backOut', delay: .025 }}><i/><b/></motion.span>
        <motion.span className="dx-parcel-box box-front" animate={burst && !reduceMotion ? { y: 68, rotate: 18, opacity: 0, scale: .8 } : { y: 0, rotate: 0, opacity: 1, scale: 1 }} transition={{ duration: .42, ease: 'backOut', delay: .05 }}><i/><b/></motion.span>
        <span className="dx-parcel-tap-hint">{burst ? '✨ NICE!' : 'TAP TO BURST'}</span>
      </motion.button>
      <div className="dx-parcel-shadow"/>
      <div className="dx-parcel-stat"><span>📦</span><div><strong>{String(count).padStart(2, '0')}</strong><small>parcel pops</small></div></div>
    </div>
  </section>;
}

function Overview({ datasets, activeDataset, setActiveDataset, refresh, notify, setPage, user, datasetsLoading, datasetsError }) {
  const chartMotion = useChartMotion();
  const [history, setHistory] = useState([]); const [analytics, setAnalytics] = useState(null); const [profile, setProfile] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/history').then(setHistory).catch(() => {}); }, []);
  useEffect(() => { if (!activeDataset) { setAnalytics(null); setProfile(null); return; } setBusy(true); Promise.all([api(`/api/datasets/${activeDataset.id}`), activeDataset.date_col && activeDataset.target_col ? api(`/api/datasets/${activeDataset.id}/analytics`, { method: 'POST', body: JSON.stringify({ date_col: activeDataset.date_col, target_col: activeDataset.target_col, product_col: activeDataset.product_col }) }).catch(() => null) : Promise.resolve(null)]).then(([p,a]) => { setProfile(p); setAnalytics(a); }).catch(e => notify(e.message,'error')).finally(() => setBusy(false)); }, [activeDataset?.id]);
  const daily = analytics?.daily?.slice(-21) || [];
  return <><PageHeader eyebrow="YOUR COMMAND CENTER" title={`Good to see you, ${user.name?.split(' ')[0] || 'there'}.`} description="Here’s the latest from your demand workspace." actions={<Button onClick={() => setPage('data')} icon={Plus}>Add dataset</Button>}/>
    <DashboardParcelPlayground onExplore={() => setPage('insights')}/>
    {datasetsLoading ? <DashboardSkeleton/> : datasetsError ? <section className="panel large-empty"><EmptyState icon={Database} title="Workspace data unavailable" description={datasetsError} action="Retry dataset loading" onAction={refresh}/></section> : !datasets.length ? <div className="welcome-banner"><div className="welcome-orb"><Sparkles size={23}/></div><div className="welcome-copy"><div className="banner-eyebrow">A CLEARER VIEW STARTS HERE</div><h2>Bring your order data into focus.</h2><p>Upload a CSV or Excel file to uncover patterns, evaluate a model, and forecast demand for a product on a specific date.</p><Button onClick={() => setPage('data')} icon={CloudUpload}>Upload your first dataset</Button></div><div className="banner-illustration"><div className="illustration-grid"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div><div className="illustration-card"><div className="illustration-card-head"><span/><span/><span/></div><div className="illustration-bars"><i/><i/><i/><i/><i/><i/><i/></div><div className="illustration-line"><svg viewBox="0 0 180 60" preserveAspectRatio="none"><path d="M2 48 C22 42, 25 30, 45 34 S75 50, 93 25 S120 28, 138 12 S160 20, 178 4" fill="none" stroke="#76d8a4" strokeWidth="3" strokeLinecap="round"/></svg></div></div></div></div> : <>
      <div className="context-bar"><div className="context-left"><span className="live-dot"/><span>ACTIVE DATASET</span><strong>{activeDataset?.filename || 'Choose a dataset'}</strong></div><DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset}/></div>
      <div className="stats-grid"><StatCard label="Rows in dataset" value={profile ? fmt(profile.rows) : '—'} note={profile ? `${profile.columns_count} columns available` : 'Select a dataset'} icon={Database} tint="mint"/><StatCard label="Total demand" value={analytics ? compact(analytics.summary.total_demand) : '—'} note="Sum of selected demand column" icon={Package} tint="blue"/><StatCard label="Average demand" value={analytics ? fmt(analytics.summary.average_demand) : '—'} note="Per observed record" icon={Gauge} tint="gold"/><StatCard label="Saved forecasts" value={fmt(history.length)} note="Across your workspace" icon={Target} tint="purple"/></div>
      <div className="overview-grid"><ChartCard title="Demand over time" subtitle="Daily total · most recent 21 days" action={<button className="text-action" onClick={() => setPage('insights')}>Explore <ArrowRight size={14}/></button>}>{busy ? <ChartSkeleton/> : daily.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{top:8,right:8,left:-18,bottom:0}}><defs><linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61c995" stopOpacity={.28}/><stop offset="100%" stopColor="#61c995" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={28}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="demand" stroke="#2f9d6d" strokeWidth={2.5} fill="url(#demandFill)" activeDot={{r:4,strokeWidth:0}} {...chartMotion}/></AreaChart></ResponsiveContainer></div> : <EmptyState icon={LineChart} title="No demand chart yet" description="Choose a dataset with date and numeric demand columns." action="Configure data" onAction={() => setPage('data')}/>}</ChartCard>
      <section className="panel quick-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Move from data to decisions.</p></div><div className="quick-panel-mark"><Zap size={17}/></div></div><div className="quick-action-list"><button onClick={() => setPage('data')}><div className="quick-action-icon mint"><Upload size={17}/></div><div><strong>Manage your data</strong><span>Upload, inspect and clean files</span></div><ArrowRight size={16}/></button><button onClick={() => setPage('forecast')}><div className="quick-action-icon purple"><Target size={17}/></div><div><strong>Forecast a product</strong><span>Pick a day and estimate demand</span></div><ArrowRight size={16}/></button><button onClick={() => setPage('models')}><div className="quick-action-icon blue"><Activity size={17}/></div><div><strong>Evaluate a model</strong><span>Measure error on unseen days</span></div><ArrowRight size={16}/></button></div><div className="quick-note"><ShieldCheck size={15}/><span>Predictions are estimates, not guarantees.</span></div></section></div>
      <div className="bottom-grid"><section className="panel"><div className="panel-head"><div><h3>Dataset snapshot</h3><p>What DemandX detected in your file.</p></div><button className="icon-btn" aria-label="Refresh dataset" onClick={() => refresh()}><RefreshCw size={16}/></button></div>{profile ? <div className="snapshot-table"><div className="snapshot-row snapshot-heading"><span>Column</span><span>Type</span><span>Missing</span></div>{profile.columns?.slice(0,6).map(c => <div className="snapshot-row" key={c.name}><strong title={c.name}>{c.name}</strong><span className="type-pill">{c.dtype}</span><span className={c.missing ? 'missing-value' : ''}>{c.missing}</span></div>)}</div> : <div className="skeleton-lines"><i/><i/><i/></div>}</section><section className="panel"><div className="panel-head"><div><h3>Recent forecasts</h3><p>Your latest demand estimates.</p></div><button className="text-action" onClick={() => setPage('history')}>View all <ArrowRight size={14}/></button></div>{history.length ? <div className="recent-list">{history.slice(0,4).map(h => <div className="recent-row" key={h.id}><div className="recent-icon"><Target size={16}/></div><div className="recent-details"><strong>{h.product}</strong><span>{dateLabel(h.date)} · {h.filename}</span></div><div className="recent-value"><strong>{formatMeasure(h.demand,h.measure)}</strong><span>{h.measure || 'units'} forecast</span></div></div>)}</div> : <div className="mini-empty"><div className="mini-empty-icon"><CalendarDays size={18}/></div><strong>No forecasts yet</strong><span>Your saved forecasts will show up here.</span><button onClick={() => setPage('forecast')}>Create a forecast <ArrowRight size={13}/></button></div>}</section></div>
    </>}
  </>;
}
function ChartTooltip({ active, payload, label, measure }) { if (!active || !payload?.length) return null; return <motion.div className="chart-tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .14 }}><span>{label?.length > 12 ? dateLabel(label) : label}</span>{payload.map((p,i)=>{const unit=measure||p.payload?.measure;return <div key={i}><i style={{background:p.color || '#2f9d6d'}}/><strong>{unit ? formatMeasure(p.value,unit) : fmt(p.value)}</strong><small>{p.name}{unit ? ` · ${unit}` : ''}</small></div>;})}</motion.div>; }
function ChartSkeleton() { return <div className="chart-skeleton" role="status" aria-label="Loading chart data"><i/><i/><i/><i/><i/><i/><i/></div>; }
function DashboardSkeleton() { return <div className="dashboard-skeleton" role="status" aria-label="Loading workspace data"><div className="stats-grid">{[0, 1, 2, 3].map(item => <div className="dashboard-skeleton-card" key={item}><i/><i/><i/></div>)}</div><div className="overview-grid"><section className="panel"><div className="dashboard-skeleton-heading"><i/><i/></div><ChartSkeleton/></section><section className="panel"><div className="dashboard-skeleton-heading"><i/><i/></div><div className="skeleton-lines"><i/><i/><i/></div></section></div></div>; }

function DataWorkspace({ datasets, activeDataset, setActiveDataset, refresh, notify }) {
  const [file, setFile] = useState(null); const [uploading, setUploading] = useState(false); const [profile, setProfile] = useState(null); const [cleanDateCol, setCleanDateCol] = useState(''); const [cleanTargetCol, setCleanTargetCol] = useState(''); const [cleaning, setCleaning] = useState(false); const [dragging, setDragging] = useState(false); const [report, setReport] = useState(null);
  useEffect(() => { if (!activeDataset) { setProfile(null); return; } api(`/api/datasets/${activeDataset.id}`).then(p => { setProfile(p); setCleanDateCol(p.date_col || ''); setCleanTargetCol(p.target_col || ''); }).catch(e => notify(e.message,'error')); setReport(null); }, [activeDataset?.id]);
  const upload = async () => { if (!file) return; setUploading(true); try { const fd = new FormData(); fd.append('file',file); const data = await api('/api/datasets',{method:'POST',body:fd}); setFile(null); refresh(); setActiveDataset(data); setProfile(data); notify('Dataset uploaded successfully.'); } catch(e) { notify(e.message,'error'); } finally { setUploading(false); } };
  const clean = async () => { if (!activeDataset || !profile) return; setCleaning(true); try { const data = await api(`/api/datasets/${activeDataset.id}/clean`,{method:'POST',body:JSON.stringify({date_col:cleanDateCol || null,target_col:cleanTargetCol || null})}); setReport(data.report); const refreshed = await api(`/api/datasets/${activeDataset.id}`); setProfile(refreshed); setCleanDateCol(refreshed.date_col || ''); setCleanTargetCol(refreshed.target_col || ''); refresh(); notify('Cleaning completed.'); } catch(e) { notify(e.message,'error'); } finally { setCleaning(false); } };
  const download = async () => { try { const r = await fetch(`${API}/api/datasets/${activeDataset.id}/download`,{headers:{Authorization:`Bearer ${sessionStorage.getItem('demandx_google_token')}`}}); if (!r.ok) { const d=await r.json(); throw new Error(d.detail || 'Download failed'); } const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${(activeDataset.filename || 'dataset').replace(/\.[^.]+$/,'')}_cleaned.csv`; a.click(); URL.revokeObjectURL(url); } catch(e) { notify(e.message,'error'); } };
  const chooseFile = (f) => { if (!f) return; if (!/\.(csv|xlsx|xls)$/i.test(f.name)) { notify('Choose a CSV, XLSX, or XLS file.','error'); return; } setFile(f); };
  return <><PageHeader eyebrow="DATA WORKSPACE" title="Make your data model-ready." description="Upload a real dataset, inspect its structure, and clean it before analysis." actions={datasets.length > 0 && <DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>}/>
    <div className="data-layout"><div className="data-main"><section className="panel upload-panel"><div className="panel-head"><div><h3>Upload dataset</h3><p>Start with the order history you want to understand.</p></div><div className="upload-tag"><ShieldCheck size={14}/> Private to you</div></div><motion.div className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`} whileHover={{ scale: 1.006 }} whileTap={{ scale: .995 }} transition={{ duration: .18 }} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files?.[0])}}><input id="dataset-file" type="file" accept=".csv,.xlsx,.xls" onChange={e=>chooseFile(e.target.files?.[0])}/><label htmlFor="dataset-file" className="dropzone-content"><div className="upload-cloud"><CloudUpload size={26}/></div><strong>{file ? file.name : 'Drop your file here, or browse'}</strong><span>{file ? `${(file.size/1024/1024).toFixed(2)} MB · Ready to upload` : 'CSV or Excel · Up to 30 MB · 500,000 rows'}</span><span className="browse-label">{file ? 'Choose a different file' : 'Browse files'}</span></label></motion.div><AnimatePresence initial={false}>{uploading && <motion.div className="upload-processing" role="status" initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -4 }} transition={{ duration: .2 }}><LoaderCircle size={15} className="spin"/><span>Uploading and validating the selected file…</span></motion.div>}</AnimatePresence><div className="upload-footer"><div className="upload-format"><FileSpreadsheet size={16}/><span>CSV, XLSX, XLS</span><span className="format-divider"/><span>First sheet is used for Excel files</span></div><div className="upload-actions">{file && <Button variant="ghost" onClick={()=>setFile(null)}>Cancel</Button>}<Button onClick={upload} disabled={!file || uploading} icon={uploading ? LoaderCircle : Upload}>{uploading ? 'Uploading…' : 'Upload dataset'}</Button></div></div></section>
      {profile ? <section className="panel data-preview-panel"><div className="panel-head"><div><h3>Dataset preview</h3><p>{profile.filename} · {fmt(profile.rows)} rows · {profile.columns_count} columns</p></div><div className="preview-actions"><Button variant="secondary" onClick={download} icon={Download}>Download CSV</Button><Button onClick={clean} disabled={cleaning} icon={cleaning ? LoaderCircle : WandSparkles}>{cleaning ? 'Cleaning…' : 'Clean data'}</Button></div></div><div className="data-clean-config"><Select label="Date column (optional)" value={cleanDateCol} onChange={setCleanDateCol} options={(profile.columns || []).map(c => typeof c === 'string' ? c : c.name)} placeholder="No date column"/><Select label="Numeric demand column (optional)" value={cleanTargetCol} onChange={setCleanTargetCol} options={(profile.columns || []).map(c => typeof c === 'string' ? c : c.name)} placeholder="No target column"/></div><div className="profile-stats"><div><span>Rows</span><strong>{fmt(profile.rows)}</strong></div><div><span>Columns</span><strong>{fmt(profile.columns_count)}</strong></div><div><span>Missing cells</span><strong className={profile.missing_cells ? 'value-warn' : ''}>{fmt(profile.missing_cells)}</strong></div><div><span>Duplicate rows</span><strong>{fmt(profile.duplicate_rows)}</strong></div></div><div className="table-scroll"><table className="data-table"><thead><tr>{(profile.columns || []).map(c=><th key={c.name}>{c.name}</th>)}</tr></thead><tbody>{(profile.preview || []).slice(0,10).map((row,i)=><tr key={i}>{(profile.columns || []).map(c=><td key={c.name} title={row[c.name] == null ? '' : String(row[c.name])}>{row[c.name] == null ? <span className="null-value">—</span> : String(row[c.name])}</td>)}</tr>)}</tbody></table></div><div className="table-foot"><span>Showing {Math.min(profile.preview?.length || 0,10)} preview rows</span><span>Horizontal scroll for more columns</span></div></section> : <section className="panel data-empty-panel"><EmptyState icon={FileSpreadsheet} title="Your dataset will appear here" description="Upload a file above or choose an existing dataset to inspect its columns, missing values, and duplicate rows."/></section>}
      {report && <section className="panel clean-report"><div className="clean-report-head"><div className="clean-success"><Check size={17}/></div><div><h3>Cleaning report</h3><p>Actions applied to the saved dataset.</p></div></div><div className="clean-actions">{report.actions?.length ? report.actions.map((a,i)=><div key={i}><Check size={14}/><span>{a}</span></div>) : <div><Check size={14}/><span>No changes were needed based on the selected columns.</span></div>}</div><div className="clean-summary"><span>Rows before <strong>{fmt(report.before_rows)}</strong></span><ArrowRight size={15}/><span>Rows after <strong>{fmt(report.after_rows)}</strong></span></div></section>}
    </div><aside className="data-side"><section className="panel side-help"><div className="help-icon"><Sparkles size={18}/></div><h3>What makes a good demand dataset?</h3><p>DemandX works best when the data has one row per order or product-day, with a date and a numeric measure of demand.</p><ul><li><Check size={14}/> Date or timestamp</li><li><Check size={14}/> Numeric quantity or orders</li><li><Check size={14}/> Product or category (optional)</li><li><Check size={14}/> Platform or store (optional)</li></ul></section><section className="panel dataset-list-panel"><div className="panel-head"><div><h3>Your datasets</h3><p>{datasets.length} file{datasets.length === 1 ? '' : 's'} saved</p></div><button className="icon-btn" aria-label="Refresh datasets" onClick={refresh}><RefreshCw size={15}/></button></div>{datasets.length ? <div className="saved-datasets">{datasets.map(d=><button key={d.id} className={`saved-dataset ${activeDataset?.id === d.id ? 'selected' : ''}`} onClick={()=>setActiveDataset(d)}><div className="file-icon"><FileSpreadsheet size={16}/></div><div className="saved-dataset-copy"><strong>{d.filename}</strong><span>{fmt(d.rows)} rows · {d.columns_count} columns</span></div>{activeDataset?.id === d.id ? <Check size={16} className="selected-check"/> : <ChevronRight size={16}/>}</button>)}</div> : <div className="side-empty">Uploaded files will be listed here.</div>}</section></aside></div>
  </>;
}

function useDatasetProfile(activeDataset, notify) { const [profile,setProfile]=useState(null); useEffect(()=>{if(!activeDataset){setProfile(null);return;} api(`/api/datasets/${activeDataset.id}`).then(setProfile).catch(e=>notify(e.message,'error'));},[activeDataset?.id]); return profile; }
function Insights({ datasets, activeDataset, setActiveDataset, notify, setPage }) {
  const chartMotion = useChartMotion();
  const profile=useDatasetProfile(activeDataset,notify); const [dateCol,setDateCol]=useState(''); const [targetCol,setTargetCol]=useState(''); const [productCol,setProductCol]=useState(''); const [data,setData]=useState(null); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!profile)return;setDateCol(profile.date_col||'');setTargetCol(profile.target_col||'');setProductCol(profile.product_col||'');setData(null);},[profile?.id]);
  const columns=profile?.columns?.map(c=>c.name)||[];
  const monthly = useMemo(() => {
    if (!data?.daily) return [];
    const groups = {};
    data.daily.forEach(row => { const key=String(row.date).slice(0,7); if(!groups[key]) groups[key]={month:key,demand:0,days:0}; groups[key].demand+=Number(row.demand)||0; groups[key].days+=1; });
    return Object.values(groups).map(x=>({...x, average:x.days?x.demand/x.days:0}));
  }, [data]);
  const distribution = useMemo(() => {
    if (!data?.distribution?.length) return [];
    const nums=data.distribution.map(Number).filter(Number.isFinite); const min=Math.min(...nums), max=Math.max(...nums); const bins=8; const width=(max-min)/bins || 1;
    const out=Array.from({length:bins},(_,i)=>({range:`${fmt(min+i*width)}–${fmt(i===bins-1?max:min+(i+1)*width)}`,count:0}));
    nums.forEach(v=>{const i=Math.min(bins-1,Math.floor((v-min)/width));out[i].count+=1;}); return out;
  }, [data]);
  const run=async()=>{if(!activeDataset){notify('Upload or select a dataset first.','error');return;}if(!dateCol||!targetCol){notify('Select both a date column and a numeric demand column.','error');return;}setBusy(true);try{setData(await api(`/api/datasets/${activeDataset.id}/analytics`,{method:'POST',body:JSON.stringify({date_col:dateCol,target_col:targetCol,product_col:productCol||null})}));}catch(e){notify(e.message,'error');setData(null);}finally{setBusy(false);}};
  return <><PageHeader eyebrow="ANALYTICS" title="Find the pattern behind demand." description="Explore daily movement, product mix, and the shape of your data." actions={<DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>}/>
    {!activeDataset ? <section className="panel large-empty"><EmptyState icon={BarChart3} title="Choose a dataset to explore" description="Your charts will use real values from the dataset you upload." action="Go to data workspace" onAction={()=>setPage('data')}/></section> : <><section className="panel config-panel"><div className="config-intro"><div className="config-icon"><Filter size={18}/></div><div><h3>Analysis settings</h3><p>Confirm which columns represent time and demand.</p></div></div><div className="config-fields"><Select label="Date column" value={dateCol} onChange={setDateCol} options={columns}/><Select label="Demand column" value={targetCol} onChange={setTargetCol} options={columns}/><Select label="Product / category" value={productCol} onChange={setProductCol} options={columns} placeholder="Optional"/><Button onClick={run} disabled={busy} icon={busy?LoaderCircle:BarChart3}>{busy?'Analyzing…':'Refresh analysis'}</Button></div></section>
    {data ? <><div className="stats-grid compact-stats"><StatCard label={`Total ${data.measure}`} value={formatMeasure(data.summary.total_demand,data.measure)} note={`Across ${fmtCount(data.summary.rows)} valid rows · ${fmtCount(data.summary.duplicate_rows_excluded)} exact duplicates excluded`} icon={Package}/><StatCard label={`Average daily ${data.measure}`} value={formatMeasure(data.summary.average_demand,data.measure)} note="Calendar-day average, including zero-filled gaps" icon={Gauge} tint="blue"/><StatCard label="Peak date" value={dateLabel(data.summary.peak_day)} note={`${formatMeasure(data.summary.peak_demand,data.measure)} ${data.measure}`} icon={TrendingUp} tint="gold"/><StatCard label="Date coverage" value={`${dateLabel(data.summary.date_from)} – ${dateLabel(data.summary.date_to)}`} note={`${fmtCount(data.daily.length)} calendar days`} icon={CalendarDays} tint="purple"/></div>
      <div className="two-chart-grid"><ChartCard title={`Daily ${data.measure} trend`} subtitle={`Actual daily totals · ${data.summary.date_from} to ${data.summary.date_to}`}><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily} margin={{top:10,right:8,left:-18,bottom:0}}><defs><linearGradient id="insightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61c995" stopOpacity={.25}/><stop offset="100%" stopColor="#61c995" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={30}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip measure={data.measure}/>} /><Area type="monotone" dataKey="demand" name={data.measure} stroke="#2f9d6d" strokeWidth={2.4} fill="url(#insightFill)" {...chartMotion}/></AreaChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title={`Average ${data.measure} by weekday`} subtitle="Mean daily total by weekday; missing dates count as zero"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.weekday} margin={{top:10,right:4,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="day" tickFormatter={d=>d.slice(0,3)} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip measure={data.measure}/>} /><Bar dataKey="demand" name={`Avg ${data.measure}`} radius={[5,5,0,0]} {...chartMotion}>{data.weekday.map((entry,i)=><Cell key={entry.day} fill={i>4?'#9bdcc0':'#50b985'}/>)}</Bar></BarChart></ResponsiveContainer></div></ChartCard></div>
      {data.products.length>0 && <div className="two-chart-grid"><ChartCard title="Top products / categories" subtitle={`Highest total ${data.measure}`}><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.products} layout="vertical" margin={{top:4,right:14,left:8,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" horizontal={false}/><XAxis type="number" tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} tick={{fill:'#68766f',fontSize:11}}/><Tooltip content={<ChartTooltip measure={data.measure}/>} /><Bar dataKey="demand" name={data.measure} radius={[0,5,5,0]} {...chartMotion}>{data.products.map((p,i)=><Cell key={p.name} fill={colors[i%colors.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></ChartCard></div>}
      <div className="two-chart-grid analysis-extra-grid">
        <ChartCard title={`Monthly ${data.measure}`} subtitle="Monthly totals and average across calendar days"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="month" tickFormatter={m=>{const d=new Date(`${m}-15T12:00:00`);return d.toLocaleDateString('en',{month:'short',year:'2-digit'});}} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip measure={data.measure}/>} /><Bar dataKey="demand" name={`Total ${data.measure}`} fill="#4dbb82" radius={[5,5,0,0]} {...chartMotion}/><Line dataKey="average" name={`Daily average ${data.measure}`} stroke="#7185e8" strokeWidth={2.2} dot={false} {...chartMotion}/></ComposedChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Daily demand distribution" subtitle={`Frequency of calendar-day ${data.measure} totals by range`}><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="range" tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:9}} interval="preserveStartEnd"/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="count" name="Calendar days" fill="#8c9ff0" radius={[5,5,0,0]} {...chartMotion}/></BarChart></ResponsiveContainer></div></ChartCard>
      </div>
    </> : <section className="panel analysis-placeholder">{busy ? <><LoaderCircle size={24} className="spin"/><strong>Analyzing your data…</strong><span>Preparing charts from the selected columns.</span></> : <EmptyState icon={LineChart} title="Ready when you are" description="Confirm the columns above, then refresh analysis to build charts from your dataset."/>}</section>}</>}
  </>;
}

function ForecastStudio({ datasets, activeDataset, setActiveDataset, notify, setPage, daywise = false }) {
  const chartMotion = useChartMotion();
  const profile=useDatasetProfile(activeDataset,notify); const [dateCol,setDateCol]=useState(''); const [targetCol,setTargetCol]=useState(''); const [productCol,setProductCol]=useState(''); const [productValue,setProductValue]=useState(''); const [forecastDate,setForecastDate]=useState(''); const [model,setModel]=useState('gradient_boosting'); const [result,setResult]=useState(null); const [busy,setBusy]=useState(false); const [values,setValues]=useState([]); const [historyEnd,setHistoryEnd]=useState('');
  useEffect(()=>{if(!profile)return;setDateCol(profile.date_col||'');setTargetCol(profile.target_col||'');setProductCol(profile.product_col||'');setProductValue('');setResult(null);setHistoryEnd(profile.date_max || '');},[profile?.id]);
  useEffect(()=>{if(!profile||!productCol||!activeDataset)return; // unique values come from the real preview only; backend handles unseen values with validation.
    const vals=profile.columns?.find(c=>c.name===productCol)?.values || [...new Set((profile.preview||[]).map(r=>r[productCol]).filter(v=>v!==null&&v!==undefined).map(String))];setValues(vals.map(String));if(vals.length&&!vals.includes(productValue))setProductValue(vals[0]);
  },[productCol,profile?.id]);
  const run=async()=>{if(!activeDataset){notify('Upload or select a dataset first.','error');return;}if(!dateCol||!targetCol||!forecastDate){notify('Select a date column, demand column, and forecast date.','error');return;}if(productCol&&!productValue.trim()){notify('Enter or choose a product to forecast.','error');return;}setBusy(true);setResult(null);try{const data=await api(`/api/datasets/${activeDataset.id}/forecast`,{method:'POST',body:JSON.stringify({date_col:dateCol,target_col:targetCol,product_col:productCol||null,product_value:productCol?productValue:null,forecast_date:forecastDate,model})});setResult(data);setHistoryEnd(data.history_end);notify('Demand forecast generated and saved.');}catch(e){notify(e.message,'error');}finally{setBusy(false);}};
  const columns=profile?.columns?.map(c=>c.name)||[];
  return <><PageHeader eyebrow={daywise ? 'DAY-WISE PREDICTION' : 'FORECAST STUDIO'} title={daywise ? 'Predict demand for any day.' : 'Make a plan for a specific day.'} description={daywise ? 'Choose a product and target date to estimate demand, with the daily forecast path and model error alongside it.' : 'Choose a product, select the date that matters, and generate a forecast from its historical demand.'} actions={<DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>}/>
    {!activeDataset ? <section className="panel large-empty"><EmptyState icon={Target} title="Your forecast starts with data" description="Upload an order dataset with dates and numeric demand to create a forecast." action="Go to data workspace" onAction={()=>setPage('data')}/></section> : <div className="forecast-layout"><div className="forecast-main"><section className="panel forecast-form-panel"><div className="forecast-form-heading"><div className="forecast-heading-icon"><Target size={20}/></div><div><h3>Configure your forecast</h3><p>DemandX learns from the selected product’s daily history.</p></div><span className="model-badge"><Sparkles size={13}/> ML powered</span></div><div className="forecast-fields"><Select label="Date column" value={dateCol} onChange={setDateCol} options={columns}/><Select label="Demand / quantity column" value={targetCol} onChange={setTargetCol} options={columns}/><Select label="Product / category column" value={productCol} onChange={v=>{setProductCol(v);setProductValue('');}} options={columns} placeholder="Forecast all products"/>{productCol && <ProductInput label="Product to forecast" value={productValue} onChange={setProductValue} options={values} helper="Choose a suggestion or type the exact value used in your dataset."/>}<TextInput label="Forecast date" type="date" value={forecastDate} onChange={setForecastDate} min={historyEnd ? (()=>{const d=new Date(historyEnd+'T12:00:00');d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)})() : undefined} helper={historyEnd ? `Last date in this product's history: ${historyEnd}` : 'Choose a date after the latest date in your dataset.'}/><Select label="Forecast model" value={model} onChange={setModel} options={[{value:'gradient_boosting',label:'Gradient Boosting · balanced'}, {value:'random_forest',label:'Random Forest · robust'}]}/></div><div className="forecast-form-foot"><div className="forecast-foot-note"><ShieldCheck size={15}/><span>Uses real historical values and calendar patterns. No demo predictions.</span></div><Button onClick={run} disabled={busy} icon={busy?LoaderCircle:WandSparkles}>{busy?'Building forecast…':'Generate forecast'}</Button></div></section>
      {busy && <section className="panel forecast-loading"><div className="forecast-loader-ring"><LoaderCircle size={25}/></div><div><h3>Learning from your demand history</h3><p>Preparing daily features, testing on unseen dates, and estimating the selected day.</p></div><div className="loading-track"><span/></div></section>}
      {result && <><section className="forecast-result-hero"><div className="result-top"><div className="result-label"><span className="result-dot"/> DEMAND ESTIMATE</div><span className="result-model">{model === 'gradient_boosting' ? 'Gradient Boosting' : 'Random Forest'}</span></div><div className="result-number">{fmt(result.prediction)}<span>units</span></div><div className="result-caption">Estimated demand for <strong>{result.product}</strong> on <strong>{new Date(`${result.forecast_date}T12:00:00`).toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</strong>.</div><div className="result-meta"><span><CalendarDays size={14}/> {result.history_days} historical days</span><span><Activity size={14}/> MAE {fmt(result.evaluation.mae)}</span><span><ShieldCheck size={14}/> Evaluation included</span></div></section>
        <div className="two-chart-grid forecast-charts"><ChartCard title="Forecast path" subtitle="Estimated daily demand from the next day through your selected date"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><ReLineChart data={result.forecast_path} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={28}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="demand" name="Forecast" stroke="#2f9d6d" strokeWidth={2.5} dot={false} activeDot={{r:4}} {...chartMotion}/></ReLineChart></ResponsiveContainer></div></ChartCard><ChartCard title="Model validation" subtitle="Actual vs predicted on held-out historical days"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><ReLineChart data={result.evaluation_predictions} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={25}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="actual" name="Actual" stroke="#9aa8a1" strokeWidth={2} dot={false} {...chartMotion}/><Line type="monotone" dataKey="predicted" name="Predicted" stroke="#7c8ef5" strokeWidth={2.2} dot={false} {...chartMotion}/></ReLineChart></ResponsiveContainer></div></ChartCard></div><div className="forecast-caveat"><div className="caveat-icon"><CircleHelp size={17}/></div><div><strong>How to read this estimate</strong><p>{result.explanation} MAE is the average absolute error on the historical holdout; lower is generally better. Real demand can still vary because promotions, weather, stock-outs, and festivals may not be represented in the data.</p></div></div><div className="result-actions"><Button variant="secondary" icon={Download} onClick={()=>downloadJSON(result,`demandx-forecast-${result.forecast_date}.json`)}>Download forecast details</Button><Button variant="ghost" icon={History} onClick={()=>notify('This forecast is saved in Forecast history.')}>Saved to history <Check size={14}/></Button></div></>}
    </div><aside className="forecast-side"><section className="panel forecast-guide"><div className="guide-top"><div className="guide-icon"><Sparkles size={18}/></div><span>FORECAST GUIDE</span></div><h3>A forecast is only as good as its history.</h3><p>For a useful estimate, make sure your data covers the product you selected and includes enough days to capture weekly patterns.</p><div className="guide-checklist"><div><span className="guide-check"><Check size={12}/></span><div><strong>21+ days of history</strong><span>More history helps reveal repeat patterns.</span></div></div><div><span className="guide-check"><Check size={12}/></span><div><strong>Consistent demand units</strong><span>Use quantity, units sold, or daily order counts.</span></div></div><div><span className="guide-check"><Check size={12}/></span><div><strong>One clear product group</strong><span>Forecast the same SKU or category over time.</span></div></div></div></section><section className="panel model-metrics-note"><div className="metric-note-icon"><Activity size={17}/></div><h3>Every forecast is evaluated</h3><p>DemandX reserves the latest historical dates for a holdout test and shows error metrics alongside your estimate.</p><div className="metric-mini"><span>MAE</span><strong>Average absolute error</strong></div><div className="metric-mini"><span>RMSE</span><strong>Penalizes larger misses</strong></div></section></aside></div>}
  </>;
}
function DaywisePrediction({ datasets, activeDataset, setActiveDataset, notify, setPage }) {
  const chartMotion = useChartMotion();
  const runInFlight = useRef(false);
  const profile = useDatasetProfile(activeDataset, notify);
  const [dateCol, setDateCol] = useState('');
  const [targetCol, setTargetCol] = useState('');
  const [productCol, setProductCol] = useState('');
  const [productValue, setProductValue] = useState('');
  const [forecastDate, setForecastDate] = useState('');
  const [model, setModel] = useState('gradient_boosting');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  useEffect(() => {
    if (!profile) return;
    const available = (profile.columns || []).map(c => typeof c === 'string' ? c : c.name);
    const normalized = name => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const orderId = available.find(c => ['order_id', 'orderid', 'order_number', 'order_no', 'transaction_id', 'transaction_number'].includes(normalized(c)));
    const quantityTarget = available.find(c => ['quantity', 'qty', 'units_sold', 'unit_count', 'order_count', 'orders', 'demand'].includes(normalized(c)));
    const date = available.find(c => ['order_date', 'date', 'order_datetime', 'timestamp'].includes(normalized(c))) || profile.date_col || '';
    // Existing datasets can have stale auto-detected metadata (e.g. order_total).
    // If there is no explicit quantity/count measure, count order IDs instead.
    const target = quantityTarget || orderId || profile.target_col || '';
    setDateCol(date);
    setTargetCol(target);
    setProductCol(quantityTarget ? (profile.product_col || '') : '');
    setProductValue('');
    setProductOptions([]);
    setResult(null);
    setForecastDate('');
    setError('');
  }, [profile?.id]);
  useEffect(() => {
    if (!profile || !productCol) { setProductOptions([]); return; }
    const col = profile.columns?.find(c => c.name === productCol);
    const vals = col?.values || [...new Set((profile.preview || []).map(r => r[productCol]).filter(v => v !== null && v !== undefined).map(String))];
    setProductOptions(vals.map(String));
    if (vals.length && !vals.map(String).includes(productValue)) setProductValue(String(vals[0]));
  }, [productCol, profile?.id]);
  const columns = profile?.columns?.map(c => c.name) || [];
  const run = async (requestedDate = forecastDate) => {
    if (runInFlight.current) return;
    if (!activeDataset) return notify('Upload or select a dataset first.', 'error');
    if (!dateCol || !targetCol || !requestedDate) return notify('Choose the date, demand column, and target day.', 'error');
    const parsedDate = new Date(`${requestedDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== requestedDate) {
      setError('Choose a valid calendar date.');
      return;
    }
    if (productCol && !productValue.trim()) return notify('Choose a product or category.', 'error');
    runInFlight.current = true;
    setBusy(true); setResult(null); setError('');
    try {
      const data = await api(`/api/datasets/${activeDataset.id}/forecast`, { method: 'POST', body: JSON.stringify({ date_col: dateCol, target_col: targetCol, product_col: productCol || null, product_value: productCol ? productValue : null, forecast_date: requestedDate, model }) });
      setResult(data); notify('Day-wise prediction is ready.');
    } catch (e) { setError(e.message); notify(e.message, 'error'); } finally { runInFlight.current = false; setBusy(false); }
  };
  const minimumDate = offsetDate(profile?.date_max, 1);
  const maximumDate = offsetDate(profile?.date_max, 180);
  const datePretty = result ? new Date(`${result.forecast_date}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
  return <div className="daywise-page">
    <PageHeader eyebrow="SINGLE-DAY FORECAST" title="One day. One clear estimate." description="Zoom in on the exact day you need to plan for." actions={<DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset} disabled={busy}/>}/>
    {!activeDataset ? <section className="panel large-empty"><EmptyState icon={CalendarDays} title="Start with your order history" description="Upload a dataset with dates and numeric demand to predict a specific day." action="Open data workspace" onAction={() => setPage('data')}/></section> : <>
      <section className="daywise-hero">
        <div className="daywise-aurora aurora-a"/><div className="daywise-aurora aurora-b"/><div className="daywise-orbit orbit-one"/><div className="daywise-orbit orbit-two"/>
        <motion.div className="daywise-hero-copy" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.65,ease:[.22,1,.36,1]}}>
          <div className="daywise-kicker"><span className="live-pulse"/> PRECISION DAY PLANNER</div>
          <h2>Demand, <span>day by day.</span></h2>
          <p>Pick a product. Set the date. Get a focused estimate backed by your own history.</p>
          <div className="daywise-mini-stats"><div><strong>{profile?.date_min ? dateLabel(profile.date_min) : '—'}</strong><span>History starts</span></div><i/><div><strong>{profile?.date_max ? dateLabel(profile.date_max) : '—'}</strong><span>Latest history</span></div><i/><div><strong>{profile?.rows ? fmt(profile.rows) : '—'}</strong><span>Source rows</span></div></div>
        </motion.div>
        <motion.div className="daywise-orbital-art" initial={{opacity:0,scale:.75,rotate:-12}} animate={{opacity:1,scale:1,rotate:0}} transition={{duration:.9,ease:'easeOut',delay:.12}}>
          <div className="orbital-ring ring-outer"/><div className="orbital-ring ring-inner"/><div className="orbital-core"><CalendarDays size={34}/><span>DAY</span></div><span className="orbit-chip chip-top"><TrendingUp size={14}/> Demand signal</span><span className="orbit-chip chip-bottom"><Sparkles size={14}/> ML forecast</span><span className="orbit-dot dot-a"/><span className="orbit-dot dot-b"/>
        </motion.div>
      </section>
      <div className="daywise-workspace">
        <motion.section className="panel daywise-config" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.5,delay:.08}}>
          <div className="daywise-section-head"><div className="daywise-step">01</div><div><h3>Build your prediction</h3><p>Choose the signal and target day.</p></div><span className="secure-chip"><ShieldCheck size={13}/> Your data</span></div>
          <motion.div className="daywise-fields" aria-busy={busy} inert={busy} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .34, delay: .12, ease: motionEase }}><Select label="Date column" value={dateCol} onChange={value=>{setDateCol(value);setResult(null);}} options={columns}/><Select label="Demand / quantity" value={targetCol} onChange={value=>{setTargetCol(value);setResult(null);}} options={columns}/><Select label="Product or category" value={productCol} onChange={v=>{setProductCol(v);setProductValue('');setResult(null);}} options={columns} placeholder="All products combined"/>{productCol && <Select label="Select product" value={productValue} onChange={value=>{setProductValue(value);setResult(null);}} options={productOptions} placeholder="Choose product"/>}<TextInput label="Prediction date" type="date" value={forecastDate} onChange={value=>{setForecastDate(value);if(value)run(value);else{setResult(null);setError('');}}} min={minimumDate} max={maximumDate} helper="Select a date after history and within the next 180 days; a forecast runs when selected."/><Select label="Forecast model" value={model} onChange={value=>{setModel(value);setResult(null);}} options={[{value:'gradient_boosting',label:'Gradient Boosting'},{value:'random_forest',label:'Random Forest'}]}/></motion.div>
          <motion.button className="daywise-run" whileHover={{scale:1.015,y:-2}} whileTap={{scale:.985}} onClick={run} disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17}/> Reading demand patterns…</> : <><WandSparkles size={17}/> Predict this day <ArrowRight size={17}/></>}</motion.button>
          <div className="daywise-footnote"><ShieldCheck size={14}/> Estimates are generated from the selected dataset and model.</div>
        </motion.section>
        <motion.section className="daywise-output" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.5,delay:.16}}>
          <AnimatePresence mode="wait" initial={false}>
          {busy ? <motion.div key="loading" className="daywise-wait" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}><PredictionLoader label="Analyzing demand patterns"/><h3>Reading the demand rhythm</h3><p>Testing historical dates and calculating the estimate.</p><div className="spectrum-loader"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></motion.div> : result ? <motion.div key={`result-${result.forecast_date}`} className="daywise-result" initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{ opacity: 0, y: -6 }} transition={{duration:.3,ease:'easeOut'}}>
            <div className="output-overline"><span className="live-pulse"/> {result.prediction_type === 'forecast' ? 'FORECAST READY' : 'PREDICTION READY'} <span className="output-model">{model === 'gradient_boosting' ? 'Gradient Boosting' : 'Random Forest'}</span></div><div className="output-date">{datePretty}</div><div className="daywise-number-wrap"><AnimatedValue className="daywise-number" value={formatMeasure(result.prediction,result.measure)}/><span>forecast {result.measure}</span><div className="number-glow"/></div><div className="output-product">Forecast for <strong>{result.product}</strong></div><p className="forecast-caveat">This is an estimate, not an actual order count. No calibrated confidence interval is available.</p><div className="output-metrics"><div><span>MAE</span><strong>{fmt(result.evaluation.mae)}</strong><small>Average error</small></div><div><span>RMSE</span><strong>{fmt(result.evaluation.rmse)}</strong><small>Error spread</small></div><div><span>History</span><strong>{fmtCount(result.history_days)}</strong><small>Observed days</small></div></div>
            <div className="daywise-path-head"><div><strong>Daily path to target</strong><span>How the forecast evolves toward your selected date</span></div><button className="icon-btn" onClick={()=>downloadJSON(result,`demandx-daywise-${result.forecast_date}.json`)} title="Download prediction"><Download size={16}/></button></div><div className="daywise-spark-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={result.forecast_path} margin={{top:10,right:5,left:0,bottom:0}}><defs><linearGradient id="daywiseGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#75efb2" stopOpacity={.42}/><stop offset="100%" stopColor="#75efb2" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--dx-chart-grid)" vertical={false} strokeDasharray="3 4"/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'var(--dx-chart-label)',fontSize:10}} minTickGap={28}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'var(--dx-chart-label)',fontSize:10}} width={42}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="demand" stroke="#77edb2" strokeWidth={2.5} fill="url(#daywiseGlow)" activeDot={{r:5,fill:'#fff',stroke:'#77edb2',strokeWidth:3}} {...chartMotion}/></AreaChart></ResponsiveContainer></div><div className="daywise-output-actions"><Button variant="secondary" icon={Download} onClick={()=>downloadJSON(result,`demandx-daywise-${result.forecast_date}.json`)}>Export result</Button><Button variant="ghost" icon={History} onClick={()=>setPage('history')}>View history <ArrowRight size={14}/></Button></div>
          </motion.div> : error ? <motion.div key="error" className="daywise-error" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}><div><X size={20}/></div><h3>Forecast unavailable</h3><p>{error}</p><small>Check the selected columns, available history, product filter, and supported forecast horizon.</small></motion.div> : <motion.div key="empty" className="daywise-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><div className="empty-constellation"><span/><span/><span/><span/><span/><div><CalendarDays size={29}/></div></div><div className="empty-overline">YOUR NEXT DECISION</div><h3>Your day, in focus.</h3><p>Select a supported date to generate a forecast from this dataset. The forecast path and historical validation will appear here.</p><div className="empty-tags"><span><Activity size={13}/> Model validation</span><span><TrendingUp size={13}/> Forecast path</span></div></motion.div>}
          </AnimatePresence>
        </motion.section>
      </div>
    </>}
  </div>;
}

function downloadJSON(data, filename) { const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url); }

function ModelLab({ datasets, activeDataset, setActiveDataset, notify, setPage }) {
  const chartMotion = useChartMotion();
  const profile=useDatasetProfile(activeDataset,notify); const [dateCol,setDateCol]=useState(''); const [targetCol,setTargetCol]=useState(''); const [productCol,setProductCol]=useState(''); const [productValue,setProductValue]=useState(''); const [model,setModel]=useState('gradient_boosting'); const [result,setResult]=useState(null); const [busy,setBusy]=useState(false); const [products,setProducts]=useState([]);
  useEffect(()=>{if(!profile)return;setDateCol(profile.date_col||'');setTargetCol(profile.target_col||'');setProductCol(profile.product_col||'');setResult(null);},[profile?.id]);
  useEffect(()=>{if(!profile||!productCol)return;const vals=profile.columns?.find(c=>c.name===productCol)?.values || [...new Set((profile.preview||[]).map(r=>r[productCol]).filter(v=>v!=null).map(String))];setProducts(vals.map(String));if(vals.length&&!vals.includes(productValue))setProductValue(vals[0]);},[productCol,profile?.id]);
  const run=async()=>{if(!activeDataset||!dateCol||!targetCol){notify('Select a dataset, date column, and demand column.','error');return;}if(productCol&&!productValue.trim()){notify('Enter or choose a product to evaluate.','error');return;}setBusy(true);setResult(null);try{setResult(await api(`/api/datasets/${activeDataset.id}/train`,{method:'POST',body:JSON.stringify({date_col:dateCol,target_col:targetCol,product_col:productCol||null,product_value:productCol?productValue:null,model})}));}catch(e){notify(e.message,'error');}finally{setBusy(false);}};
  const columns=profile?.columns?.map(c=>c.name)||[];
  return <><PageHeader eyebrow="MODEL LAB" title="Measure before you trust." description="Evaluate a demand model against historical dates it has not seen during training." actions={<DatasetPicker datasets={datasets} activeDataset={activeDataset} setActiveDataset={setActiveDataset}/>}/>
    {!activeDataset ? <section className="panel large-empty"><EmptyState icon={Activity} title="Choose data to evaluate" description="Model evaluation needs historical dates and a numeric demand column." action="Go to data workspace" onAction={()=>setPage('data')}/></section> : <><section className="panel config-panel model-config"><div className="config-intro"><div className="config-icon"><Settings2 size={18}/></div><div><h3>Evaluation setup</h3><p>The most recent 20% of usable days are held out for testing.</p></div></div><div className="config-fields"><Select label="Date column" value={dateCol} onChange={setDateCol} options={columns}/><Select label="Demand column" value={targetCol} onChange={setTargetCol} options={columns}/><Select label="Product / category" value={productCol} onChange={v=>{setProductCol(v);setProductValue('');}} options={columns} placeholder="All products"/>{productCol&&<ProductInput label="Product to evaluate" value={productValue} onChange={setProductValue} options={products} helper="Choose a suggestion or type the exact value used in your dataset."/>}<Select label="Model" value={model} onChange={setModel} options={[{value:'gradient_boosting',label:'Gradient Boosting'},{value:'random_forest',label:'Random Forest'}]}/><Button onClick={run} disabled={busy} icon={busy?LoaderCircle:Activity}>{busy?'Evaluating…':'Run evaluation'}</Button></div></section>
      {result ? <><div className="model-result-banner"><div className="model-result-icon"><Check size={19}/></div><div><h3>Evaluation complete</h3><p>{result.message} Seasonal-naive baseline: MAE {fmt(result.metrics.baseline.mae)}, RMSE {fmt(result.metrics.baseline.rmse)}.</p></div><span className="model-badge">{result.model==='gradient_boosting'?'Gradient Boosting':'Random Forest'}</span></div><div className="stats-grid model-stats"><StatCard label="MAE" value={fmt(result.metrics.mae)} note="Average absolute error · lower is better" icon={Gauge} tint="mint"/><StatCard label="RMSE" value={fmt(result.metrics.rmse)} note="Larger misses carry more weight" icon={Activity} tint="blue"/>{result.metrics.mape_percent != null && <StatCard label="MAPE" value={`${fmt(result.metrics.mape_percent)}%`} note="Only shown when test actuals are nonzero" icon={TrendingUp} tint="gold"/>}<StatCard label="R² score" value={result.metrics.r2 == null ? '—' : result.metrics.r2.toFixed(3)} note="Can be negative on weak forecasts" icon={TrendingUp} tint="purple"/><StatCard label="Test days" value={fmtCount(result.test_days)} note={`${fmtCount(result.history_days)} total daily observations`} icon={CalendarDays} tint="gold"/></div><ChartCard title="Actual vs predicted demand" subtitle="Chronological holdout · Actual and forecast values by date"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><ReLineChart data={result.predictions} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={28}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><Tooltip content={<ChartTooltip measure={result.measure}/>} /><Line type="monotone" dataKey="actual" name="Actual" stroke="#8a9791" strokeWidth={2.2} dot={false} {...chartMotion}/><Line type="monotone" dataKey="predicted" name="Predicted" stroke="#2f9d6d" strokeWidth={2.4} dot={false} {...chartMotion}/></ReLineChart></ResponsiveContainer></div></ChartCard><ChartCard title="Forecast residuals" subtitle="Actual minus predicted · positive values are under-forecasts; zero is ideal"><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={result.predictions} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#e8eeea" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}} minTickGap={28}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:'#8a9791',fontSize:11}}/><ReferenceLine y={0} stroke="#9aa9a0" strokeDasharray="4 4"/><Tooltip content={<ChartTooltip measure={result.measure}/>} /><Bar dataKey="residual" name="Actual − predicted" radius={[3,3,0,0]} {...chartMotion}>{result.predictions.map((point,index)=><Cell key={`${point.date}-${index}`} fill={point.residual >= 0 ? '#6dd8a3' : '#f29c9c'}/>)}</Bar></BarChart></ResponsiveContainer></div></ChartCard><div className="result-actions"><Button variant="secondary" icon={Download} onClick={()=>downloadJSON(result,`demandx-model-evaluation-${new Date().toISOString().slice(0,10)}.json`)}>Download evaluation</Button></div></> : <section className="panel analysis-placeholder">{busy?<><LoaderCircle size={24} className="spin"/><strong>Evaluating model…</strong><span>Testing on later dates the model did not train on.</span></>:<EmptyState icon={Activity} title="Run your first evaluation" description="Choose your columns and model above. DemandX will report real error metrics from a chronological holdout."/>}</section>}</>}
  </>;
}

function HistoryPage({ notify, setPage }) { const [history,setHistory]=useState([]); const [busy,setBusy]=useState(true); const load=()=>{setBusy(true);api('/api/history').then(setHistory).catch(e=>notify(e.message,'error')).finally(()=>setBusy(false));}; useEffect(load,[]); const remove=async id=>{try{await api(`/api/history/${id}`,{method:'DELETE'});setHistory(h=>h.filter(x=>x.id!==id));notify('Forecast removed from history.');}catch(e){notify(e.message,'error');}};
  return <><PageHeader eyebrow="MANAGE" title="Forecast history" description="Revisit estimates you have generated from your uploaded data." actions={<Button onClick={()=>setPage('forecast')} icon={Plus}>New forecast</Button>}/><section className="panel history-panel"><div className="panel-head"><div><h3>Saved forecasts</h3><p>Each forecast includes its date, selected product, measure, and model.</p></div><button className="icon-btn" onClick={load} aria-label="Refresh history"><RefreshCw size={16}/></button></div>{busy?<div className="analysis-placeholder"><LoaderCircle className="spin" size={23}/><span>Loading saved forecasts…</span></div>:history.length?<div className="table-scroll"><table className="history-table"><thead><tr><th>Product / category</th><th>Forecast date</th><th>Estimated demand</th><th>Dataset</th><th>Model</th><th></th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td><div className="history-product"><div className="recent-icon"><Target size={15}/></div><strong>{h.product}</strong></div></td><td>{new Date(`${h.date}T12:00:00`).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</td><td><strong>{formatMeasure(h.demand,h.measure)}</strong> <span className="table-unit">{h.measure || 'units'}</span></td><td className="dataset-cell" title={h.filename}>{h.filename}</td><td><span className="type-pill">{h.model==='random_forest'?'Random Forest':'Gradient Boosting'}</span></td><td><button className="icon-btn delete-btn" aria-label={`Remove forecast for ${h.product}`} onClick={()=>remove(h.id)}><X size={15}/></button></td></tr>)}</tbody></table></div>:<EmptyState icon={History} title="Your history is empty" description="When you generate a forecast, DemandX saves it here so you can return to it later." action="Create your first forecast" onAction={()=>setPage('forecast')}/>}</section><div className="history-note"><ShieldCheck size={16}/><span>History is private to your Google account and stored locally by this backend deployment.</span></div></>;
}

function Root() { const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-client-id.apps.googleusercontent.com'; return <MotionConfig reducedMotion="user"><ThemeProvider><GoogleOAuthProvider clientId={clientId}><AuthProvider><App/></AuthProvider></GoogleOAuthProvider></ThemeProvider></MotionConfig>; }

createRoot(document.getElementById('root')).render(<React.StrictMode><Root/></React.StrictMode>);
