import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ROLE_LABELS = {
  captain: 'Captain',
  vice_captain: 'Vice Captain',
  surveillance_head: 'Surveillance Lead',
  engineer: 'Engineer',
  analyst: 'Analyst',
};

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'token' || e.key === 'authToken') {
        setUser(authService.getCurrentUser());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const displayName = user?.name || user?.email || 'Operator';
  const roleKey = user?.role;
  const roleLabel = roleKey ? ROLE_LABELS[roleKey] || roleKey.replace(/_/g, ' ') : '';
  const avatarSrc =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0891b2&color=fff&size=128&bold=true`;

  const handleLogout = () => {
    setMenuOpen(false);
    authService.logout();
  };

  return (
    <header className="z-50 flex h-14 items-center justify-between border-b border-primary/20 bg-background-dark/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-primary">radar</span>
          <h1
            className="text-lg font-bold uppercase tracking-widest text-primary"
            style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.5)' }}
          >
            Deep-Drishti
          </h1>
        </div>
        <div className="h-6 w-px bg-primary/20" />
        <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-tighter">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-slate-100">● LIVE</span>
          </div>
          <div className="text-slate-400">Sector 7-G / Atlantic North</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="mr-2 hidden flex-col items-end sm:flex">
          <span className="text-[10px] uppercase leading-none text-primary/60">Signed in</span>
          <span className="max-w-[10rem] truncate text-sm font-bold tracking-wide text-white">
            {displayName}
          </span>
          {roleLabel && (
            <span className="text-[10px] uppercase text-slate-500">{roleLabel}</span>
          )}
        </div>
        <button
          type="button"
          className="border border-primary/20 p-2 text-primary hover:bg-primary/10"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-xl leading-none">notifications</span>
        </button>
        <Link
          to="/settings"
          className="border border-primary/20 p-2 text-primary hover:bg-primary/10"
          aria-label="Open settings"
        >
          <span className="material-symbols-outlined text-xl leading-none">settings</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm border border-primary/40 bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Profile menu for ${displayName}`}
          >
            <img className="h-full w-full object-cover" alt="" src={avatarSrc} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-md border border-slate-700/80 bg-slate-950 py-1 shadow-2xl shadow-black/90 z-[100] ring-1 ring-slate-800"
            >
              <div className="border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-2.5">
                <p className="text-xs font-bold text-slate-100 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email || '—'}</p>
                {roleLabel && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                    {roleLabel}
                  </span>
                )}
              </div>
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                  Profile &amp; settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
