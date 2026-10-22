import { motion, useReducedMotion } from 'framer-motion';
import { Activity } from 'lucide-react';

export function AnimatedLogo({ compact = false }) {
  return <span className={`loading-logo ${compact ? 'loading-logo-compact' : ''}`} aria-hidden="true">
    <svg className="loading-logo-orbit" viewBox="0 0 100 100">
      <circle className="loading-orbit-base" cx="50" cy="50" r="43"/>
      <circle className="loading-orbit-trace" cx="50" cy="50" r="43"/>
      <circle className="loading-orbit-satellite" cx="50" cy="7" r="2.5"/>
    </svg>
    <span className="loading-logo-mark"><Activity size={compact ? 22 : 30} strokeWidth={2.1}/></span>
    <span className="loading-logo-spark loading-logo-spark-one"/>
    <span className="loading-logo-spark loading-logo-spark-two"/>
  </span>;
}

export function AppSplashScreen({ label = 'Preparing your workspace' }) {
  const reduceMotion = useReducedMotion();
  return <motion.div
    className="app-splash"
    role="status"
    aria-live="polite"
    aria-label={label}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: 'easeOut' }}
  >
    <div className="splash-ambience" aria-hidden="true"><span/><span/><span/></div>
    <div className="splash-content">
      <motion.div
        className="splash-brand"
        initial={reduceMotion ? false : { opacity: 0, scale: .92, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatedLogo/>
        <span>Demand<span className="splash-brand-x">X</span></span>
      </motion.div>
      <span className="splash-status">{label}<i aria-hidden="true">…</i></span>
      <span className="splash-progress" aria-hidden="true"><i/></span>
    </div>
  </motion.div>;
}

export function PredictionLoader({ label = 'Analyzing demand patterns' }) {
  return <motion.div
    className="prediction-loader"
    role="status"
    aria-live="polite"
    initial={{ opacity: 0, y: 7 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -5 }}
    transition={{ duration: .2 }}
  >
    <span className="prediction-loader-orbit" aria-hidden="true"><i/><i/><i/></span>
    <span>{label}<i aria-hidden="true">…</i></span>
  </motion.div>;
}
