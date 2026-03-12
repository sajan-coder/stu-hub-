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
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] bg-paper-cream border-r-2 border-gray-300 flex flex-col items-center py-6 z-50 selection:bg-transparent font-handwritten group/sidebar transition-all duration-300 hover:w-[72px]">
      {/* Brand Icon - Dashboard Link */}
      <div
        onClick={() => onNavigate('dashboard')}
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-12 cursor-pointer transition-all duration-300 group ${activeTab === 'dashboard' ? 'bg-yellow-200 text-black shadow-cutout rotate-0' : 'bg-white text-gray-600 hover:bg-yellow-100 hover:rotate-[-6deg] border-2 border-gray-300'
          }`}
      >
        <span className="text-2xl">📓</span>
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
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative border-2 ${isActive
                  ? 'bg-yellow-200 text-black shadow-cutout border-gray-400'
                  : 'text-gray-500 hover:text-black hover:bg-yellow-50 border-gray-200 hover:border-gray-400'
                  }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />

                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute -left-3 w-2 h-8 bg-yellow-300 rounded-r-full shadow-cutout"
                  />
                )}
              </div>

              {/* Tooltip with doodle style */}
              <div className="absolute left-[70px] px-4 py-2 bg-yellow-100 text-black rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-cutout translate-x-3 group-hover:translate-x-0 z-[100] border-2 border-gray-300 whitespace-nowrap flex flex-col gap-0.5 transform rotate-1">
                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                <span className="text-[10px] font-medium text-gray-500 tracking-tight">{item.sub}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / System Control */}
      <div className="mt-auto flex flex-col items-center">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border-2 ${activeTab === 'settings'
            ? 'bg-yellow-200 text-black border-gray-400'
            : 'text-gray-500 hover:text-black hover:bg-yellow-50 border-gray-200'
            }`}
        >
          <Settings size={18} strokeWidth={1.5} />
          <div className="absolute left-[64px] px-3 py-1.5 bg-yellow-100 text-black text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-cutout translate-x-3 group-hover:translate-x-0 z-[100] border-2 border-gray-300 whitespace-nowrap transform rotate-1">
            ⚙️ Settings
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
