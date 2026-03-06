import React, { useState, useEffect } from 'react';
import {
    BookOpen, Zap, Calendar, Activity, Briefcase,
    LayoutGrid, ArrowRight, Play, Square, Clock,
    Database, ClipboardCheck, TrendingUp, Target,
    ChevronRight, ChevronDown, Monitor, Clock4
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyStats } from '../hooks/useStudyStats';

// ── Helpers ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// High-end Scholastic Chart
function BarChart({ data, labels }) {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-3 h-44 w-full pt-10 group/chart">
            {data.map((v, i) => {
                const pct = (v / max) * 100;
                const isToday = i === (new Date().getDay() + 6) % 7;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 relative">
                        <div className="h-32 w-full flex flex-col justify-end">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(pct, 5)}%` }}
                                className={`w-full rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isToday ? 'bg-[#111111] shadow-xl' : 'bg-[#E8E8E7] group-hover/chart:bg-[#DCDCDA]'
                                    }`}
                            />
                        </div>
                        <span className={`text-[10px] font-bold tracking-widest transition-colors duration-300 ${isToday ? 'text-[#111111]' : 'text-[#A1A1A0]'
                            }`}>
                            {labels[i]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const SubjectRow = ({ label, percentage, color }) => (
    <div className="flex items-center justify-between group cursor-default py-1">
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[13px] font-medium text-[#5F5F5E] group-hover:text-[#1A1A1A] transition-colors">{label}</span>
        </div>
        <span className="text-[12px] font-bold text-[#A1A1A0] tabular-nums">{percentage}%</span>
    </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const MainOverview = ({ onNavigate }) => {
    const {
        stats, todayHours, weekTotal, topSubject,
        startSession, stopSession, isSessionRunning
    } = useStudyStats();

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const weekHours = Math.round(weekTotal / 60 * 10) / 10;

    const statsConfig = [
        { icon: Clock4, label: "Session focus", value: todayHours || '0h 0m', diff: '+14%', color: 'text-grey-900', bg: 'bg-[#F1F1F0]' },
        { icon: Database, label: 'Materials indexed', value: String(stats.filesIndexed || 0), diff: 'Sync', color: 'text-grey-900', bg: 'bg-[#F1F1F0]' },
        { icon: ClipboardCheck, label: 'Task completion', value: `${stats.tasksCompleted || 0}/${stats.totalTasks || 0}`, diff: 'Active', color: 'text-grey-400', bg: 'bg-[#F1F1F0]' },
        { icon: TrendingUp, label: 'Current streak', value: `${weekHours}h`, diff: 'Steady', color: 'text-grey-400', bg: 'bg-[#F1F1F0]' },
    ];

    const labModules = [
        { id: 'notes', icon: BookOpen, title: 'Smart Notes', desc: 'Synthesize complex materials into high-density insights.' },
        { id: 'planner', icon: Calendar, title: 'Study Planner', desc: 'Dynamic scheduling based on cognitive load management.' },
        { id: 'career', icon: Briefcase, title: 'Career Guide', desc: 'Predictive job analytics and career path mapping.' },
        { id: 'tools', icon: LayoutGrid, title: 'Academic Lab', desc: 'A curated collection of scientific toolkits and academic utilities.' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 ml-[72px] bg-[#F8F8F7] min-h-screen py-20 px-24 font-inter selection:bg-[#F2E27D]/40"
        >
            {/* ── HEADER ── */}
            <header className="flex justify-between items-start mb-24 max-w-7xl mx-auto">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-3 bg-[#111111] rounded-full" />
                        <span className="text-[10px] font-bold text-[#A1A1A0] uppercase tracking-[0.2em]">{dateStr} / OPERATION_SCHOLAR</span>
                    </div>
                    <h1 className="text-[40px] font-semibold tracking-tight text-[#1A1A1A] leading-[1.1] max-w-xl">
                        Welcome to your workstation, Scholar.
                    </h1>
                </div>

                <button
                    onClick={isSessionRunning ? stopSession : startSession}
                    className={`h-11 px-8 rounded-[11px] font-semibold text-[13px] transition-all duration-300 flex items-center gap-3 active:scale-95 border-b-2 ${isSessionRunning
                        ? 'bg-[#111111] text-white border-black hover:opacity-90'
                        : 'bg-[#FFFFFF] text-[#1A1A1A] border-[#DCDCDA] hover:bg-[#F1F1F0] shadow-sm'
                        }`}
                >
                    {isSessionRunning ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" strokeWidth={0} />}
                    {isSessionRunning ? 'End Session' : 'Start Focus Session'}
                </button>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-x-12 gap-y-24">
                {/* ── STATS MODULE ── */}
                <div className="col-span-12">
                    <div className="grid grid-cols-4 gap-8">
                        {statsConfig.map((s, i) => (
                            <div key={i} className="flex flex-col gap-4 group">
                                <div className="flex items-center gap-3 text-[#A1A1A0] group-hover:text-[#1A1A1A] transition-colors">
                                    <s.icon size={15} />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">{s.label}</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-semibold tracking-tight tabular-nums">{s.value}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest py-1 px-2 rounded-md bg-[#F1F1F0] text-[#5F5F5E]">{s.diff}</span>
                                </div>
                                <div className="h-px bg-[#E8E8E7] mt-3 mr-4 group-hover:bg-[#DCDCDA] transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ANALYTICS CORE ── */}
                <div className="col-span-8 flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold flex items-center gap-3">
                            <Activity size={16} strokeWidth={2.5} /> Cognitive Velocity
                        </h3>
                    </div>
                    <div className="p-10 bg-white border border-[#E8E8E7] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <BarChart data={stats.weeklyMinutes} labels={DAYS} />
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-8">
                    <h3 className="text-[15px] font-semibold flex items-center gap-3">
                        <Target size={16} strokeWidth={2.5} /> Knowledge Density
                    </h3>
                    <div className="p-10 bg-white border border-[#E8E8E7] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-6">
                            <div className="w-full h-2.5 bg-[#F1F1F0] rounded-full overflow-hidden flex">
                                {Object.entries(stats.subjects || {}).map(([label, val], i) => {
                                    const colors = ['#111111', '#5F5F5E', '#A1A1A0', '#DCDCDA'];
                                    const total = Object.values(stats.subjects).reduce((a, b) => a + b, 0);
                                    return (
                                        <div
                                            key={i}
                                            style={{ width: `${(val / total) * 100}%`, backgroundColor: colors[i % colors.length] }}
                                            className="h-full border-r border-white last:border-0"
                                        />
                                    );
                                })}
                            </div>
                            <div className="space-y-3">
                                {Object.entries(stats.subjects || {}).map(([label, val], i) => {
                                    const colors = ['#111111', '#5F5F5E', '#A1A1A0', '#DCDCDA'];
                                    const total = Object.values(stats.subjects).reduce((a, b) => a + b, 0);
                                    return (
                                        <SubjectRow
                                            key={i}
                                            label={label}
                                            percentage={Math.round((val / total) * 100)}
                                            color={colors[i % colors.length]}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── LAB ACCESS ── */}
                <div className="col-span-12">
                    <div className="flex items-center gap-8 mb-12">
                        <h3 className="text-[20px] font-semibold tracking-tight">Academic Lab</h3>
                        <div className="h-px flex-1 bg-[#E8E8E7]" />
                    </div>

                    <div className="grid grid-cols-4 gap-x-12">
                        {labModules.map((f, i) => (
                            <motion.div
                                key={i}
                                onClick={() => onNavigate?.(f.id)}
                                className="group cursor-pointer relative"
                            >
                                <div className="w-12 h-12 bg-white border border-[#E8E8E7] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#111111] group-hover:text-white group-hover:border-black group-hover:shadow-lg transition-all duration-300">
                                    <f.icon size={20} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-[15px] font-bold mb-2 flex items-center gap-2">
                                    {f.title}
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </h4>
                                <p className="text-[13px] font-medium text-[#A1A1A0] leading-relaxed line-clamp-2">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MainOverview;
