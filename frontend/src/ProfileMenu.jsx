import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LoaderCircle, LogOut, Save, UserRound, X } from 'lucide-react';

function initials(name = 'User') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export default function ProfileMenu({ user, onSave, signOut }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.name || '');
  const [organization, setOrganization] = useState(user.organization || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    setDisplayName(user.name || '');
    setOrganization(user.organization || '');
  }, [user.name, user.organization]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const save = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ display_name: displayName, organization });
    } catch (saveError) {
      setError(saveError.message || 'Profile changes could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="profile-menu" ref={rootRef}>
    <button className="profile-trigger" type="button" aria-label="Open profile settings" aria-expanded={open} aria-controls="profile-panel" onClick={() => setOpen(value => !value)}>
      <span className="avatar">{user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer"/> : initials(user.name)}</span>
      <ChevronDown size={14} aria-hidden="true"/>
    </button>
    <AnimatePresence>
      {open && <motion.section id="profile-panel" className="profile-panel" aria-label="Profile settings" initial={{ opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .98 }} transition={{ duration: .16 }}>
        <div className="profile-panel-head">
          <div className="profile-panel-avatar">{user.picture ? <img src={user.picture} alt=""/> : initials(user.name)}</div>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close profile settings"><X size={15}/></button>
        </div>
        <form onSubmit={save}>
          <label className="profile-field"><span>Display name</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} required autoComplete="name"/></label>
          <label className="profile-field"><span>Organization <small>Optional</small></span><input value={organization} onChange={event => setOrganization(event.target.value)} maxLength={120} autoComplete="organization"/></label>
          {error && <p className="profile-error" role="alert">{error}</p>}
          <button type="submit" className="profile-save" disabled={busy || !displayName.trim()}>{busy ? <LoaderCircle size={15} className="spin"/> : <Save size={15}/>} {busy ? 'Saving…' : 'Save profile'}</button>
        </form>
        <div className="profile-identity"><UserRound size={14}/><span>Name and email are verified from your Google account. Only display name and organization are editable.</span></div>
        <button type="button" className="profile-signout" onClick={signOut}><LogOut size={15}/> Sign out</button>
      </motion.section>}
    </AnimatePresence>
  </div>;
}
