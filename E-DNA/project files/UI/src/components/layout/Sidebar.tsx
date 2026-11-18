// ========================================================
// DEEPDRISHTI WORKSPACE SIDEBAR
// Ruled navigation panel: active 2px left rule, no filled pill, no glow
// ========================================================

import React, { useState } from 'react';
import { BrandMark } from '../common/BrandMark';
import {
  LayoutDashboard,
  Dna,
  GitBranch,
  Activity,
  MapPin,
  Users,
  Network,
  Sparkles,
  Cpu,
  GitCompare,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type WorkspaceView =
  | 'overview'
  | 'asv_explorer'
  | 'taxonomy'
  | 'biodiversity'
  | 'map'
  | 'community'
  | 'novelty'
  | 'ai_analysis'
  | 'compare'
  | 'report'
  | 'settings';

interface SidebarProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems: { id: WorkspaceView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
    { id: 'asv_explorer', label: 'ASV Explorer', icon: <Dna size={17} strokeWidth={1.5} /> },
    { id: 'taxonomy', label: 'Taxonomy', icon: <GitBranch size={17} strokeWidth={1.5} /> },
    { id: 'biodiversity', label: 'Biodiversity', icon: <Activity size={17} strokeWidth={1.5} /> },
    { id: 'map', label: 'Biodiversity Map', icon: <MapPin size={17} strokeWidth={1.5} /> },
    { id: 'community', label: 'Community', icon: <Users size={17} strokeWidth={1.5} /> },
    { id: 'novelty', label: 'Novelty', icon: <Sparkles size={17} strokeWidth={1.5} /> },
    { id: 'ai_analysis', label: 'AI Analysis', icon: <Cpu size={17} strokeWidth={1.5} /> },
    { id: 'compare', label: 'Compare', icon: <GitCompare size={17} strokeWidth={1.5} /> },
    { id: 'report', label: 'Report', icon: <FileText size={17} strokeWidth={1.5} /> },
  ];

  return (
    <aside
      className={`bg-paper-sunk border-r border-rule flex flex-col justify-between transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="p-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <BrandMark size={22} className="flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-serif font-bold text-[13px] tracking-wider uppercase text-ink">
                  DEEPDRISHTI
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-ink-faint">
                  eDNA Intelligence
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-control hover:bg-paper text-ink-faint hover:text-ink transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Main Navigation Items */}
        <nav className="py-3 flex flex-col space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-mono transition-colors group ${
                  isActive
                    ? 'text-ink font-medium bg-paper/60'
                    : 'text-ink-muted hover:text-ink hover:bg-paper/30'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {/* 2px survey left rule on active item */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-survey" />
                )}
                <span
                  className={`${
                    isActive ? 'text-survey' : 'text-ink-muted group-hover:text-ink'
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Settings & Logout */}
      <div className="p-2 border-t border-rule space-y-1">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] font-mono rounded-control transition-colors ${
            activeView === 'settings'
              ? 'text-ink font-medium bg-paper'
              : 'text-ink-muted hover:text-ink hover:bg-paper/40'
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <SettingsIcon size={17} strokeWidth={1.5} className="text-ink-muted" />
          {!collapsed && <span>Settings</span>}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] font-mono rounded-control text-ink-muted hover:text-error hover:bg-paper/40 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={17} strokeWidth={1.5} className="text-ink-muted" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
