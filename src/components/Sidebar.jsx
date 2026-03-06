import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Cpu,
  StickyNote,
  Calendar,
  Briefcase,
  Box,
  Settings,
  LogOut,
  ChevronRight,
  Monitor,
  Zap,
  Search
} from 'lucide-react';

const MODULES = [
  { id: 'assistant', icon: Cpu, label: 'AI Assistant', sub: 'Neural Core' },
  { id: 'notes', icon: StickyNote, label: 'Smart Notes', sub: 'Synthesis' },
  { id: 'planner', icon: Calendar, label: 'Study Planner', sub: 'Scheduler' },
  { id: 'career', icon: Briefcase, label: 'Career Guide', sub: 'Navigator' },
  { id: 'tools', icon: Box, label: 'Academic Lab', sub: 'Toolkits' },
];

const Sidebar = ({ activeTab, onNavigate }) => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] bg-[#FFFFFF] border-r border-[#E8E8E7] flex flex-col items-center py-8 z-50 selection:bg-transparent font-inter group/sidebar transition-all duration-300 hover:w-[72px]">
      {/* Brand Icon - Dashboard Link */}
      <div
        onClick={() => onNavigate('dashboard')}
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-12 cursor-pointer transition-all duration-300 group ${activeTab === 'dashboard' ? 'bg-[#111111] text-white shadow-xl rotate-0' : 'bg-[#F1F1F0] text-[#1A1A1A] hover:bg-[#111111] hover:text-white hover:rotate-[-6deg]'
          }`}
      >
        <LayoutDashboard size={20} strokeWidth={2.5} />
      </div>

      {/* Main 5 Modules */}
      <nav className="flex-1 flex flex-col gap-6">
        {MODULES.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="group relative flex flex-col items-center p-1 outline-none"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative ${isActive
                  ? 'bg-[#111111] text-white shadow-xl shadow-black/10 scale-105'
                  : 'text-[#A1A1A0] hover:text-[#1A1A1A] hover:bg-[#FBFBFA] border border-transparent hover:border-[#F1F1F0]'
                  }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />

                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute -left-3 w-1.5 h-7 bg-[#111111] rounded-r-full shadow-[2px_0_8px_rgba(0,0,0,0.1)]"
                  />
                )}
              </div>

              {/* Premium Expanded Hover State (Notion/Linear style tooltips) */}
              <div className="absolute left-[70px] px-4 py-2 bg-[#111111] text-white rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl translate-x-3 group-hover:translate-x-0 z-[100] border border-white/10 whitespace-nowrap flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                <span className="text-[9px] font-medium text-white/40 tracking-tight">{item.sub}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / System Control */}
      <div className="mt-auto flex flex-col items-center">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${activeTab === 'settings'
            ? 'bg-[#111111] text-white'
            : 'text-[#A1A1A0] hover:text-[#1A1A1A] hover:bg-[#F1F1F0]'
            }`}
        >
          <Settings size={18} strokeWidth={1.5} />
          <div className="absolute left-[64px] px-3 py-1.5 bg-[#111111] text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl translate-x-3 group-hover:translate-x-0 z-[100] border border-white/10 whitespace-nowrap">
            System Settings
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
